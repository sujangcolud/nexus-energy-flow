/**
 * ADVANCED MULTI-CHARGER CSMS LOGIC
 * Powered by Supabase Realtime
 */

(function() {
    // 1. Configuration - Use environment variables if available, else fallback to current context
    const supabaseUrl = window.env?.SUPABASE_URL;
    const supabaseKey = window.env?.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("CSMS ERROR: Missing Supabase API Configuration (SUPABASE_URL, SUPABASE_ANON_KEY).");
        const container = document.getElementById('charger-list');
        if (container) {
            container.innerHTML = '<div class="p-4 text-rose-500 text-[10px] font-bold uppercase tracking-widest bg-rose-500/5 border border-rose-500/10 rounded-xl">Config Error: Missing API Keys</div>';
        }
        return;
    }

    const sb = window.supabase.createClient(supabaseUrl, supabaseKey);
    let currentSelectedId = null;
    let chargers = new Map();
    let chart = null;
    let powerHistory = [];

    // 2. Initialization
    async function init() {
        setupChart();
        await fetchAllChargers();
        subscribeToRealtime();

        // Auto-select first charger if available
        if (chargers.size > 0) {
            selectCharger(Array.from(chargers.keys())[0]);
        }
    }

    // 3. Data Fetching
    async function fetchAllChargers() {
        try {
            const { data, error } = await sb
                .from('charger_status')
                .select('*')
                .order('updated_at', { ascending: false });

            if (error) throw error;

            if (data && data.length > 0) {
                data.forEach(c => chargers.set(c.charger_id, c));
                renderChargerList();
            } else {
                const container = document.getElementById('charger-list');
                container.innerHTML = '<div class="p-8 text-slate-600 text-[10px] font-bold uppercase tracking-widest text-center">No Chargers Registered</div>';
            }
        } catch (err) {
            console.error("Fetch Error:", err.message);
        }
    }

    // 4. Realtime Subscription
    function subscribeToRealtime() {
        sb.channel('global-csms')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'charger_status' }, (payload) => {
                const newData = payload.new;
                if (!newData) return;

                chargers.set(newData.charger_id, newData);
                renderChargerList();

                if (currentSelectedId === newData.charger_id) {
                    updateMainUI(newData);
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log("Connected to Realtime CSMS Stream");
                }
            });
    }

    // 5. UI Rendering
    function renderChargerList() {
        const container = document.getElementById('charger-list');
        if (!container) return;
        container.innerHTML = '';

        Array.from(chargers.values()).forEach(c => {
            const isActive = c.charger_id === currentSelectedId;
            const statusColor = getStatusColor(c.status);

            const div = document.createElement('div');
            div.className = `charger-item glass-card p-4 flex items-center justify-between mb-2 ${isActive ? 'active' : ''}`;
            div.onclick = () => selectCharger(c.charger_id);

            div.innerHTML = `
                <div class="flex items-center gap-3">
                    <div class="w-2 h-2 rounded-full ${statusColor} ${c.status === 'Charging' ? 'animate-pulse' : ''}"></div>
                    <div>
                        <p class="text-xs font-black uppercase tracking-tight text-white">${c.charger_id}</p>
                        <p class="text-[8px] font-bold uppercase text-slate-500">${c.status}</p>
                    </div>
                </div>
                <div class="text-right">
                    <p class="text-[10px] font-black text-blue-500">${(c.power_kw || 0).toFixed(1)} kW</p>
                </div>
            `;
            container.appendChild(div);
        });
    }

    function selectCharger(id) {
        currentSelectedId = id;
        powerHistory = []; // Reset history for new charger

        const emptyState = document.getElementById('empty-state');
        const dashboardContent = document.getElementById('dashboard-content');

        if (emptyState) emptyState.classList.add('hidden');
        if (dashboardContent) dashboardContent.classList.remove('hidden');

        const data = chargers.get(id);
        if (data) {
            updateMainUI(data);
        }
        renderChargerList();
    }

    function updateMainUI(data) {
        const idDisp = document.getElementById('display-charger-id');
        const pwrDisp = document.getElementById('val-power');
        const vltDisp = document.getElementById('val-voltage');
        const curDisp = document.getElementById('val-current');
        const socDisp = document.getElementById('val-soc');
        const socBar = document.getElementById('bar-soc');
        const syncDisp = document.getElementById('display-last-update');
        const statusBadge = document.getElementById('display-status-badge');

        if (idDisp) idDisp.innerText = data.charger_id;
        if (pwrDisp) pwrDisp.innerText = (data.power_kw || 0).toFixed(1);
        if (vltDisp) vltDisp.innerText = Math.round(data.voltage || 0);
        if (curDisp) curDisp.innerText = (data.current || 0).toFixed(1);

        const soc = data.soc || 0;
        if (socDisp) socDisp.innerText = soc > 0 ? soc.toFixed(1) : '--';
        if (socBar) socBar.style.width = `${soc}%`;

        const lastSync = new Date(data.updated_at).toLocaleTimeString();
        if (syncDisp) syncDisp.innerText = `Live sync active • Last update: ${lastSync}`;

        if (statusBadge) {
            statusBadge.innerText = data.status;
            statusBadge.className = `px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getStatusBadgeClasses(data.status)}`;
        }

        // Update Chart
        if (chart) {
            const ts = new Date(data.updated_at).getTime();
            powerHistory.push({ x: ts, y: data.power_kw });
            if (powerHistory.length > 50) powerHistory.shift();
            chart.updateSeries([{ data: powerHistory }]);
        }
    }

    // 6. Helpers
    function getStatusColor(status) {
        if (!status) return 'bg-slate-600';
        const s = status.toLowerCase();
        if (s === 'charging') return 'bg-green-500';
        if (s === 'available' || s === 'online') return 'bg-blue-500';
        if (s === 'finishing' || s === 'preparing') return 'bg-amber-500';
        return 'bg-slate-600';
    }

    function getStatusBadgeClasses(status) {
        if (!status) return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        const s = status.toLowerCase();
        if (s === 'charging') return 'bg-green-500/10 text-green-400 border-green-500/20';
        if (s === 'available' || s === 'online') return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }

    function setupChart() {
        const container = document.querySelector("#main-power-chart");
        if (!container) return;

        const options = {
            series: [{ name: 'Power', data: [] }],
            chart: {
                type: 'area', height: 320, foreColor: '#64748b',
                toolbar: { show: false },
                animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 800 } },
                zoom: { enabled: false }
            },
            colors: ['#3b82f6'],
            stroke: { curve: 'smooth', width: 3 },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
            xaxis: { type: 'datetime', labels: { show: false }, axisBorder: { show: false } },
            yaxis: { min: 0, labels: { style: { colors: '#475569', fontWeight: 700 } } },
            grid: { borderColor: 'rgba(255,255,255,0.05)', strokeDashArray: 4 }
        };

        chart = new ApexCharts(container, options);
        chart.render();
    }

    init();
})();
