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
    const viewDashboard = document.getElementById('view-dashboard');
    const viewStations = document.getElementById('view-stations');
    const viewDetail = document.getElementById('view-charger-detail');
    const viewTransactions = document.getElementById('view-transactions');
    const viewReports = document.getElementById('view-reports');
    const navItems = [
        document.getElementById('nav-dashboard'),
        document.getElementById('nav-stations'),
        document.getElementById('nav-transactions'),
        document.getElementById('nav-reports')
    ];

    async function init() {
        setupChart();
        await fetchData();
        subscribeToRealtime();
        renderStationsTable();
        renderTransactionsTable();
        updateOverviewStats();

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
            renderTransactionsTable();
        });

        // Transaction filters
        const txStatusFilters = document.querySelectorAll('#transaction-status-filters button');
        txStatusFilters.forEach(btn => {
            btn.addEventListener('click', () => {
                txStatusFilters.forEach(b => {
                    b.classList.remove('bg-white', 'shadow-sm', 'text-slate-800');
                    b.classList.add('text-slate-500');
                });
                btn.classList.add('bg-white', 'shadow-sm', 'text-slate-800');
                btn.classList.remove('text-slate-500');

                renderTransactionsTable({ status: btn.dataset.filter });
            });
        });

        const txChargerFilter = document.getElementById('filter-transaction-charger');
        if (txChargerFilter) {
            txChargerFilter.addEventListener('input', (e) => {
                renderTransactionsTable({ chargerId: e.target.value });
            });
        }

        const txIdFilter = document.getElementById('filter-transaction-id');
        if (txIdFilter) {
            txIdFilter.addEventListener('input', (e) => {
                renderTransactionsTable({ transactionId: e.target.value });
            });
        }

        document.getElementById('nav-dashboard').addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-dashboard');
            showView(viewDashboard);
            updateOverviewStats();
        });

        document.getElementById('nav-reports').addEventListener('click', (e) => {
            e.preventDefault();
            setActiveNav('nav-reports');
            showView(viewReports);
            updateOverviewCharts();
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
        [viewDashboard, viewStations, viewDetail, viewTransactions, viewReports].forEach(v => {
            if (v === view) v.classList.remove('hidden');
            else v.classList.add('hidden');
        });
    }

    async function updateOverviewStats() {
        const total = chargers.size;
        const online = Array.from(chargers.values()).filter(c => c.status.toLowerCase() !== 'offline').length;
        const active = Array.from(chargers.values()).filter(c => c.status.toLowerCase() === 'charging').length;

        const totalEl = document.getElementById('stat-total-chargers');
        const onlineEl = document.getElementById('stat-online-chargers');
        const activeEl = document.getElementById('stat-active-sessions');
        const energyEl = document.getElementById('stat-total-energy');

        if (totalEl) totalEl.innerText = total;
        if (onlineEl) onlineEl.innerText = online;
        if (activeEl) activeEl.innerText = active;

        // Energy summary from charging_sessions
        const { data } = await sb.from('charging_sessions').select('kcal, total_amount');
        if (data && energyEl) {
            const totalEnergy = data.reduce((acc, curr) => acc + (curr.kcal || 0), 0);
            energyEl.innerHTML = `${totalEnergy.toFixed(1)} <span class="text-xs">kWh</span>`;
        }
    }

    async function updateOverviewCharts() {
        const { data: sessions } = await sb
            .from('charger_transactions')
            .select('start_time, total_energy_kwh, total_cost')
            .eq('is_active', false)
            .order('start_time', { ascending: true });

        if (!sessions || sessions.length === 0) return;

        // Group by day for simple overview
        const grouped = sessions.reduce((acc, curr) => {
            const date = new Date(curr.start_time).toLocaleDateString();
            if (!acc[date]) acc[date] = { energy: 0, revenue: 0 };
            acc[date].energy += (curr.total_energy_kwh || 0);
            acc[date].revenue += (curr.total_cost || 0);
            return acc;
        }, {});

        const categories = Object.keys(grouped);
        const energyData = categories.map(c => grouped[c].energy.toFixed(1));
        const revenueData = categories.map(c => grouped[c].revenue.toFixed(0));

        const energyChart = new ApexCharts(document.querySelector("#overview-energy-chart"), {
            series: [{ name: 'Energy (kWh)', data: energyData }],
            chart: { type: 'bar', height: 250, toolbar: { show: false } },
            colors: ['#8b5cf6'],
            xaxis: { categories },
            plotOptions: { bar: { borderRadius: 4 } }
        });
        energyChart.render();

        const revenueChart = new ApexCharts(document.querySelector("#overview-revenue-chart"), {
            series: [{ name: 'Revenue (Rs)', data: revenueData }],
            chart: { type: 'area', height: 250, toolbar: { show: false } },
            colors: ['#10b981'],
            stroke: { curve: 'smooth' },
            xaxis: { categories }
        });
        revenueChart.render();
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

    window.showChargerDetail = async (id) => {
        currentChargerId = id;

        // Reset chart state before showing new data
        powerHistory = [];
        if (chart) chart.updateSeries([{ data: [] }]);

        viewStations.classList.add('hidden');
        viewDetail.classList.remove('hidden');

        const data = chargers.get(id);
        if (data) updateDetailUI(data);

        // Fetch historical data for chart
        const { data: history } = await sb
            .from('charger_meter_values')
            .select('timestamp, power_kw')
            .eq('charger_id', id)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (history && history.length > 0) {
            powerHistory = history.map(h => ({
                x: new Date(h.timestamp).getTime(),
                y: h.power_kw
            })).reverse();
            if (chart) chart.updateSeries([{ data: powerHistory }]);
        }
    };

    window.showStationsList = () => {
        currentChargerId = null;
        setActiveNav('nav-stations');
        showView(viewStations);
    };

    async function renderTransactionsTable(filters = {}) {
        const tbody = document.getElementById('transactions-table-body');
        if (!tbody) return;

        let query = sb.from('charger_transactions').select('*');

        if (filters.status && filters.status !== 'all') {
            if (filters.status === 'active') query = query.eq('is_active', true);
            else if (filters.status === 'completed') query = query.eq('is_active', false);
        }

        if (filters.chargerId) query = query.ilike('charger_id', `%${filters.chargerId}%`);
        if (filters.transactionId) query = query.ilike('transaction_id', `%${filters.transactionId}%`);

        const { data, error } = await query
            .order('start_time', { ascending: false })
            .limit(20);

        if (error || !data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="10" class="px-6 py-12 text-center text-slate-400">No transactions found.</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        data.forEach(tx => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-slate-50 transition-colors";

            const startStr = tx.start_time ? new Date(tx.start_time).toLocaleString() : 'N/A';
            const endStr = tx.end_time ? new Date(tx.end_time).toLocaleString() : '-';
            const socStr = tx.initial_soc !== null ? `${tx.initial_soc}% - ${tx.final_soc || '...'}%` : 'N/A';

            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs text-slate-500">${tx.transaction_id}</td>
                <td class="px-6 py-4">
                    <div class="flex flex-col">
                        <span class="font-bold text-blue-600 cursor-pointer hover:underline">${tx.charger_id}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-slate-600 font-medium">0${tx.connector_id || 1}</td>
                <td class="px-6 py-4 text-slate-600 text-xs">${socStr}</td>
                <td class="px-6 py-4 text-slate-400">-</td>
                <td class="px-6 py-4 text-slate-600 font-bold">${(tx.total_energy_kwh || 0).toFixed(2)} kWh</td>
                <td class="px-6 py-4 font-bold text-slate-700">Rs. ${(tx.total_cost || 0).toFixed(2)}</td>
                <td class="px-6 py-4 text-xs text-slate-500">${startStr}</td>
                <td class="px-6 py-4 text-xs text-slate-500">${endStr}</td>
                <td class="px-6 py-4">
                    <span class="status-badge ${tx.is_active ? 'status-charging' : 'status-online'}">
                        ${tx.is_active ? 'Active' : 'Completed'}
                    </span>
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
