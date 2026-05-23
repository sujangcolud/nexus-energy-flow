/**
 * ENERGY PALACE EV CSMS - PRO DASHBOARD
 * Powered by Supabase Realtime
 */

(function() {
    const supabaseUrl = window.env?.SUPABASE_URL;
    const supabaseKey = window.env?.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("CSMS ERROR: Missing Supabase API Configuration.");
        return;
    }

    const sb = window.supabase.createClient(supabaseUrl, supabaseKey);
    let chargers = new Map();
    let connectors = new Map();
    let currentChargerId = null;
    let chart = null;
    let powerHistory = [];

    // Views
    const viewStations = document.getElementById('view-stations');
    const viewDetail = document.getElementById('view-charger-detail');
    const viewTransactions = document.getElementById('view-transactions');
    const navItems = [
        document.getElementById('nav-dashboard'),
        document.getElementById('nav-stations'),
        document.getElementById('nav-transactions')
    ];

    async function init() {
        setupChart();
        await fetchData();
        subscribeToRealtime();
        renderStationsTable();
        renderTransactionsTable();

        // Navigation listeners
        document.getElementById('nav-stations').addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-stations');
            showView(viewStations);
        });

        document.getElementById('nav-transactions').addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-transactions');
            showView(viewTransactions);
        });

        document.getElementById('nav-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-dashboard');
            showView(viewStations); // For now dashboard points to stations
        });

        // Search and Filter listeners
        const searchInput = document.querySelector('input[placeholder="Filter by Charger..."]');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                renderStationsTable(term);
            });
        }

        const filterBtns = document.querySelectorAll('.bg-slate-100 button');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => {
                    b.classList.remove('bg-white', 'shadow-sm', 'text-slate-800');
                    b.classList.add('text-slate-500');
                });
                btn.classList.add('bg-white', 'shadow-sm', 'text-slate-800');
                btn.classList.remove('text-slate-500');

                const filter = btn.innerText.toLowerCase();
                renderStationsTable(null, filter);
            });
        });
    }

    function setActiveNav(id) {
        navItems.forEach(item => {
            if (item.id === id) item.classList.add('active');
            else item.classList.remove('active');
        });
    }

    function showView(view) {
        [viewStations, viewDetail, viewTransactions].forEach(v => {
            if (v === view) v.classList.remove('hidden');
            else v.classList.add('hidden');
        });
    }

    async function fetchData() {
        const [chargersRes, connectorsRes] = await Promise.all([
            sb.from('charger_status').select('*'),
            sb.from('charger_connectors').select('*')
        ]);

        if (chargersRes.data) {
            chargersRes.data.forEach(c => chargers.set(c.charger_id, c));
        }
        if (connectorsRes.data) {
            connectorsRes.data.forEach(conn => {
                if (!connectors.has(conn.charger_id)) connectors.set(conn.charger_id, []);
                connectors.get(conn.charger_id).push(conn);
            });
        }
    }

    function subscribeToRealtime() {
        sb.channel('csms-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'charger_status' }, (payload) => {
                if (payload.new) {
                    chargers.set(payload.new.charger_id, payload.new);
                    renderStationsTable();
                    if (currentChargerId === payload.new.charger_id) updateDetailUI(payload.new);
                }
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'charger_connectors' }, (payload) => {
                if (payload.new) {
                    const cid = payload.new.charger_id;
                    let list = connectors.get(cid) || [];
                    const idx = list.findIndex(c => c.connector_id === payload.new.connector_id);
                    if (idx !== -1) list[idx] = payload.new;
                    else list.push(payload.new);
                    connectors.set(cid, list);
                    renderStationsTable();
                }
            })
            .subscribe();
    }

    function renderStationsTable(searchTerm = '', filter = 'all') {
        const tbody = document.getElementById('stations-table-body');
        if (!tbody) return;

        let list = Array.from(chargers.values());

        // Apply Search
        if (searchTerm) {
            list = list.filter(c =>
                c.charger_id.toLowerCase().includes(searchTerm) ||
                (c.charger_name && c.charger_name.toLowerCase().includes(searchTerm))
            );
        }

        // Apply Status Filter
        if (filter !== 'all') {
            list = list.filter(c => c.status.toLowerCase() === filter);
        }

        if (list.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="px-6 py-12 text-center text-slate-400">No chargers found matching criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        list.forEach(c => {
            const chargerConnectors = connectors.get(c.charger_id) || [];
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition-colors";

            const connectorHtml = chargerConnectors.length > 0
                ? chargerConnectors.map(conn => `
                    <div class="flex items-center gap-2 mb-1">
                        <span class="text-[10px] text-slate-500 font-bold uppercase">Connector ${String.fromCharCode(64 + conn.connector_id)}</span>
                        <span class="connector-status ${getStatusClass(conn.status)}">${conn.status}</span>
                    </div>
                `).join('')
                : '<span class="text-slate-400">No connectors</span>';

            tr.innerHTML = `
                <td class="px-6 py-4 font-bold text-slate-700">${c.charger_id}</td>
                <td class="px-6 py-4 text-slate-600 font-medium">${c.charger_name || 'N/A'}</td>
                <td class="px-6 py-4">${connectorHtml}</td>
                <td class="px-6 py-4 text-slate-500">${c.model || 'N/A'}</td>
                <td class="px-6 py-4 text-slate-500">${c.vendor || 'N/A'}</td>
                <td class="px-6 py-4 font-bold text-slate-700">Rs. ${c.price_per_kwh || 0}</td>
                <td class="px-6 py-4">
                    <span class="status-badge ${getStatusClass(c.status)}">${c.status}</span>
                </td>
                <td class="px-6 py-4">
                    <button onclick="window.showChargerDetail('${c.charger_id}')" class="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('station-count-display').innerText = `Showing 1-${chargers.size} of ${chargers.size}`;
    }

    function getStatusClass(status) {
        const s = status?.toLowerCase();
        if (s === 'online' || s === 'available') return 'status-online';
        if (s === 'charging' || s === 'occupied') return 'status-charging';
        if (s === 'offline' || s === 'faulted') return 'status-offline';
        return 'bg-slate-100 text-slate-500';
    }

    window.showChargerDetail = (id) => {
        currentChargerId = id;

        // Reset chart state before showing new data
        powerHistory = [];
        if (chart) chart.updateSeries([{ data: [] }]);

        viewStations.classList.add('hidden');
        viewDetail.classList.remove('hidden');

        const data = chargers.get(id);
        if (data) updateDetailUI(data);
    };

    window.showStationsList = () => {
        currentChargerId = null;
        setActiveNav('nav-stations');
        showView(viewStations);
    };

    async function renderTransactionsTable() {
        const tbody = document.getElementById('transactions-table-body');
        if (!tbody) return;

        const { data, error } = await sb
            .from('charging_sessions')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20);

        if (error || !data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-12 text-center text-slate-400">No transactions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        data.forEach(tx => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs text-slate-500">${tx.id.split('-')[0]}...</td>
                <td class="px-6 py-4 font-bold text-slate-700">System</td>
                <td class="px-6 py-4 text-slate-600">${new Date(tx.created_at).toLocaleString()}</td>
                <td class="px-6 py-4 text-slate-600">${tx.kcal || 0} kWh</td>
                <td class="px-6 py-4 font-bold text-slate-900">Rs. ${tx.total_amount || 0}</td>
                <td class="px-6 py-4">
                    <span class="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase">Success</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function updateDetailUI(data) {
        document.getElementById('display-charger-id').innerText = data.charger_id;
        document.getElementById('val-power').innerText = (data.power_kw || 0).toFixed(1);
        document.getElementById('val-voltage').innerText = Math.round(data.voltage || 0);
        document.getElementById('val-current').innerText = (data.current || 0).toFixed(1);

        const soc = data.soc || 0;
        document.getElementById('val-soc').innerText = soc > 0 ? soc.toFixed(1) : '--';
        document.getElementById('bar-soc').style.width = `${soc}%`;

        const badge = document.getElementById('display-status-badge');
        badge.innerText = data.status;
        badge.className = `status-badge ${getStatusClass(data.status)}`;

        document.getElementById('display-last-update').innerText = `Last synced: ${new Date(data.updated_at).toLocaleTimeString()}`;

        if (chart) {
            const ts = new Date(data.updated_at).getTime();
            powerHistory.push({ x: ts, y: data.power_kw });
            if (powerHistory.length > 50) powerHistory.shift();
            chart.updateSeries([{ data: powerHistory }]);
        }
    }

    function setupChart() {
        const options = {
            series: [{ name: 'Power', data: [] }],
            chart: {
                type: 'area', height: 320, foreColor: '#64748b',
                toolbar: { show: false },
                animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 800 } }
            },
            colors: ['#3b82f6'],
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
            xaxis: { type: 'datetime', labels: { show: false } },
            yaxis: { min: 0 },
            grid: { borderColor: '#f1f5f9' }
        };
        const container = document.querySelector("#main-power-chart");
        if (container) {
            chart = new ApexCharts(container, options);
            chart.render();
        }
    }

    init();
})();
