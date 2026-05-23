/**
 * ISOLATED EV CHARGING DASHBOARD LOGIC
 * Listen to Supabase Realtime for charger updates.
 */

(function() {
    // 1. Initialize Supabase using existing environment variables
    const supabaseUrl = window.env?.SUPABASE_URL;
    const supabaseKey = window.env?.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Supabase environment variables (SUPABASE_URL, SUPABASE_ANON_KEY) are missing.");
        document.getElementById('station-id').innerText = "CONFIG ERROR: Missing Env Vars";
        return;
    }

    const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

    // 2. Chart Initialization
    const options = {
        series: [{ name: 'Power (kW)', data: [] }],
        chart: {
            type: 'area',
            height: 250,
            foreColor: '#64748b',
            toolbar: { show: false },
            animations: {
                enabled: true,
                easing: 'linear',
                dynamicAnimation: { speed: 800 }
            },
            zoom: { enabled: false }
        },
        colors: ['#3b82f6'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.3,
                opacityTo: 0.05,
                stops: [0, 90, 100]
            }
        },
        xaxis: {
            type: 'datetime',
            range: 120000, // Show 2 minutes
            labels: { show: false },
            axisBorder: { show: false },
            axisTicks: { show: false }
        },
        yaxis: {
            min: 0,
            labels: { style: { colors: '#475569' } }
        },
        grid: { borderColor: '#1e293b', strokeDashArray: 4 }
    };

    const chart = new ApexCharts(document.querySelector("#live-power-chart"), options);
    chart.render();

    const powerHistory = [];

    // 3. Supabase Realtime Subscription
    // Listens for any changes in the charger_status table
    const channel = sb
        .channel('charger-updates')
        .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'charger_status' },
            (payload) => {
                if (payload.new) updateDashboard(payload.new);
            }
        )
        .subscribe();

    // 4. Update Function
    function updateDashboard(data) {
        // Update Static Metrics
        document.getElementById('station-id').innerText = `STATION: ${data.charger_id}`;
        document.getElementById('power-val').innerText = (data.power_kw || 0).toFixed(1);
        document.getElementById('voltage-val').innerText = Math.round(data.voltage || 0);
        document.getElementById('current-val').innerText = (data.current || 0).toFixed(1);

        const soc = data.soc || 0;
        document.getElementById('soc-val').innerText = soc > 0 ? soc.toFixed(1) : '--';
        document.getElementById('soc-bar').style.width = `${soc}%`;

        document.getElementById('last-update').innerText = new Date(data.updated_at).toLocaleTimeString();

        // Update Status UI
        updateStatusUI(data.status || 'Unknown');

        // Update Chart
        const ts = new Date(data.updated_at).getTime();
        powerHistory.push({ x: ts, y: data.power_kw });
        if (powerHistory.length > 100) powerHistory.shift();
        chart.updateSeries([{ data: powerHistory }]);
    }

    function updateStatusUI(status) {
        const pulse = document.getElementById('status-pulse');
        const text = document.getElementById('status-text');
        text.innerText = status;

        if (status.toLowerCase() === 'charging') {
            pulse.className = 'w-2 h-2 rounded-full bg-green-500 status-glow';
            text.className = 'text-green-400';
        } else if (status.toLowerCase() === 'available' || status.toLowerCase() === 'online') {
            pulse.className = 'w-2 h-2 rounded-full bg-blue-500 status-glow';
            text.className = 'text-blue-400';
        } else {
            pulse.className = 'w-2 h-2 rounded-full bg-red-500';
            text.className = 'text-red-400';
        }
    }
})();
