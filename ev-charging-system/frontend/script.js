// Replace with your server URL
const SERVER_URL = 'http://localhost:3000';
const socket = io(SERVER_URL);

// Chart Initialization
const chartOptions = {
    series: [{
        name: 'Power',
        data: []
    }],
    chart: {
        type: 'area',
        height: 160,
        animations: {
            enabled: true,
            easing: 'linear',
            dynamicAnimation: {
                speed: 1000
            }
        },
        toolbar: {
            show: false
        },
        zoom: {
            enabled: false
        }
    },
    dataLabels: {
        enabled: false
    },
    stroke: {
        curve: 'smooth',
        width: 3,
        colors: ['#2563eb']
    },
    fill: {
        type: 'gradient',
        gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [20, 100, 100, 100]
        }
    },
    xaxis: {
        type: 'datetime',
        range: 60000, // 60 seconds view
        labels: { show: false },
        axisBorder: { show: false },
        axisTicks: { show: false }
    },
    yaxis: {
        labels: { show: false }
    },
    grid: {
        show: false
    },
    colors: ['#2563eb']
};

const chart = new ApexCharts(document.querySelector("#power-chart"), chartOptions);
chart.render();

const powerData = [];

// Socket Listeners
socket.on('connect', () => {
    console.log('Connected to backend');
});

socket.on('chargerStatus', (data) => {
    document.getElementById('charger-id-label').innerText = `ID: ${data.chargerId}`;
    updateBadge(data.status);
});

socket.on('chargerUpdate', (data) => {
    updateBadge(data.status);
});

socket.on('transactionUpdate', (data) => {
    // Update Text Fields
    document.getElementById('power-val').innerText = data.power.toFixed(1);
    document.getElementById('voltage-val').innerText = Math.round(data.voltage);
    document.getElementById('current-val').innerText = data.current.toFixed(1);
    document.getElementById('soc-val').innerText = data.soc > 0 ? data.soc : '--';
    document.getElementById('last-update').innerText = `Last updated: ${new Date().toLocaleTimeString()}`;

    // Update Chart
    const timestamp = new Date().getTime();
    powerData.push({ x: timestamp, y: data.power });

    // Keep last 100 points
    if (powerData.length > 100) {
        powerData.shift();
    }

    chart.updateSeries([{ data: powerData }]);

    // Auto-update badge to 'Charging' if power is being consumed
    if (data.power > 0) {
        updateBadge('Charging');
    }
});

function updateBadge(status) {
    const badge = document.getElementById('status-badge');
    badge.innerText = status;

    if (status === 'Charging') {
        badge.className = 'px-3 py-1 bg-green-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30';
    } else if (status === 'Available' || status === 'Online') {
        badge.className = 'px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30';
    } else {
        badge.className = 'px-3 py-1 bg-red-500 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/30';
    }
}
