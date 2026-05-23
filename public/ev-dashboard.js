/**
 * PRODUCTION-READY EV CHARGING DASHBOARD LOGIC
 * Listen to Supabase Realtime strictly for 'theego084' updates.
 */

(function() {
    // 1. Configuration & Security
    const TARGET_CHARGER_ID = 'theego084';
    const supabaseUrl = window.env?.SUPABASE_URL;
    const supabaseKey = window.env?.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("DASHBOARD CONFIG ERROR: Missing window.env variables.");
        document.getElementById('station-id').innerText = "ERROR: Missing API Configuration";
        return;
    }

    // Initialize Supabase Client
    const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. ApexCharts Setup (Dark Mode)
    const chartOptions = {
        series: [{ name: 'Power (kW)', data: [] }],
        chart: {
            type: 'area', height: 260, foreColor: '#64748b',
            toolbar: { show: false },
            animations: { enabled: true, easing: 'linear', dynamicAnimation: { speed: 800 } },
            zoom: { enabled: false }
        },
        colors: ['#3b82f6'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { opacityFrom: 0.3, opacityTo: 0.02 } },
        xaxis: { type: 'datetime', range: 120000, labels: { show: false }, axisBorder: { show: false } },
        yaxis: { min: 0, labels: { style: { colors: '#475569' } } },
        grid: { borderColor: '#1e293b', strokeDashArray: 4 }
    };

    const chart = new ApexCharts(document.querySelector("#live-power-chart"), chartOptions);
    chart.render();
    const powerHistory = [];

    // 3. Initial Data Fetch
    async function loadInitialState() {
        try {
            const { data, error } = await sb
                .from('charger_status')
                .select('*')
                .eq('charger_id', TARGET_CHARGER_ID)
                .single();

            if (error) throw error;
            if (data) updateDashboardUI(data);
        } catch (err) {
            console.warn("No initial state found for charger:", TARGET_CHARGER_ID);
        }
    }

    // 4. Supabase Realtime: Multi-Charger Fix
    // We strictly filter for our TARGET_CHARGER_ID to prevent UI scrambling
    const subscription = sb
        .channel(`live-updates-${TARGET_CHARGER_ID}`)
        .on(
            'postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'charger_status',
                filter: `charger_id=eq.${TARGET_CHARGER_ID}`
            },
            (payload) => {
                console.log(`[Realtime] Update for ${TARGET_CHARGER_ID}:`, payload.new);
                updateDashboardUI(payload.new);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') console.log(`Connected to live stream for ${TARGET_CHARGER_ID}`);
            if (status === 'CHANNEL_ERROR') console.error("Realtime subscription failed.");
        });

    // 5. UI Rendering Logic
    function updateDashboardUI(data) {
        try {
            document.getElementById('station-id').innerText = `STATION: ${data.charger_id}`;
            document.getElementById('power-val').innerText = (data.power_kw || 0).toFixed(2);
            document.getElementById('voltage-val').innerText = Math.round(data.voltage || 0);
            document.getElementById('current-val').innerText = (data.current || 0).toFixed(1);

            const soc = data.soc || 0;
            document.getElementById('soc-val').innerText = soc > 0 ? soc.toFixed(1) : '--';
            document.getElementById('soc-bar').style.width = `${soc}%`;

            document.getElementById('last-update').innerText = `SYNCED: ${new Date(data.updated_at).toLocaleTimeString()}`;

            updateStatusBadge(data.status || 'Unknown');

            // Chart Update
            const ts = new Date(data.updated_at).getTime();
            powerHistory.push({ x: ts, y: data.power_kw });
            if (powerHistory.length > 100) powerHistory.shift();
            chart.updateSeries([{ data: powerHistory }]);
        } catch (err) {
            console.error("Dashboard Render Error:", err);
        }
    }

    function updateStatusBadge(status) {
        const pulse = document.getElementById('status-pulse');
        const text = document.getElementById('status-text');
        text.innerText = status;

        const isCharging = status.toLowerCase() === 'charging';
        const isOnline = ['available', 'online', 'preparing'].includes(status.toLowerCase());

        pulse.className = `w-2 h-2 rounded-full status-glow ${isCharging ? 'bg-green-500' : isOnline ? 'bg-blue-500' : 'bg-red-500'}`;
        if (isCharging) pulse.classList.add('animate-pulse');
        text.className = isCharging ? 'text-green-400' : isOnline ? 'text-blue-400' : 'text-red-400';
    }

    loadInitialState();
})();
