/**
 * EV CHARGING DASHBOARD - CLIENT SCRIPT
 * Connects to the Bridge Server and updates the UI in real-time.
 */

const SERVER_URL = 'http://localhost:3000';
const socket = io(SERVER_URL);

// Chart Configuration
const options = {
    series: [{ name: 'Power', data: [] }],
    chart: {
        type: 'area',
        height: 250,
        foreColor: '#94a3b8',
        toolbar: { show: false },
        animations: {
            enabled: true,
            easing: 'linear',
            dynamicAnimation: { speed: 1000 }
        },
        zoom: { enabled: false }
    },
    colors: ['#3b82f6'],
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: 4 },
    fill: {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.4,
            opacityTo: 0.05,
            stops: [0, 90, 100]
        }
    },
    grid: {
        borderColor: '#1e293b',
        strokeDashArray: 4,
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: false } }
    },
    xaxis: {
        type: 'datetime',
        range: 60000, // Show 60 seconds of data
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
    },
    yaxis: {
        min: 0,
        max: 25, // Based on 15kW simulation
        tickAmount: 5,
        labels: {
            formatter: (val) => val.toFixed(1) + ' kW'
        }
    },
    tooltip: { theme: 'dark' }
};

const chart = new ApexCharts(document.querySelector("#power-chart"), options);
chart.render();

const powerSeries = [];

// Socket.IO Listeners
socket.on('connect', () => {
    console.log('Connected to CSMS Bridge');
    updateStatusUI('Connected', 'Online');
});

socket.on('transactionUpdate', (data) => {
    // 1. Update Core Metrics
    document.getElementById('charger-id-display').innerText = `Station: ${data.chargerId}`;
    document.getElementById('power-val').innerText = data.powerKw.toFixed(2);
    document.getElementById('voltage-val').innerText = Math.round(data.voltage);
    document.getElementById('current-val').innerText = data.current.toFixed(1);

    const soc = data.soc || 0;
    document.getElementById('soc-val').innerText = soc > 0 ? soc.toFixed(1) : '--';
    document.getElementById('soc-bar').style.width = `${soc}%`;

    // 2. Update Status UI
    updateStatusUI('Connected', data.status);

    // 3. Update Last Seen
    document.getElementById('last-seen').innerText = `LAST SYNC: ${new Date(data.timestamp).toLocaleTimeString()}`;

    // 4. Update Chart
    const ts = new Date(data.timestamp).getTime();
    powerSeries.push({ x: ts, y: data.powerKw });

    // Limit data points to keep chart smooth
    if (powerSeries.length > 100) powerSeries.shift();
    chart.updateSeries([{ data: powerSeries }]);
});

socket.on('disconnect', () => {
    updateStatusUI('Disconnected', 'Offline');
});

/**
 * Updates the visual status badge and pulse
 */
function updateStatusUI(connection, chargerStatus) {
    const pulse = document.getElementById('status-pulse');
    const text = document.getElementById('status-text');

    text.innerText = chargerStatus;

    if (connection === 'Disconnected') {
        pulse.className = 'w-3 h-3 rounded-full bg-red-500';
        text.className = 'text-xs font-black uppercase tracking-widest text-red-500';
        return;
    }

    switch (chargerStatus.toLowerCase()) {
        case 'charging':
            pulse.className = 'w-3 h-3 rounded-full bg-green-500 animate-pulse';
            text.className = 'text-xs font-black uppercase tracking-widest text-green-400';
            break;
        case 'available':
        case 'online':
            pulse.className = 'w-3 h-3 rounded-full bg-blue-500';
            text.className = 'text-xs font-black uppercase tracking-widest text-blue-400';
            break;
        default:
            pulse.className = 'w-3 h-3 rounded-full bg-gray-500';
            text.className = 'text-xs font-black uppercase tracking-widest text-gray-400';
    }
}
