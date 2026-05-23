const WebSocket = require('ws');

/**
 * PRODUCTION-READY CHARGER SIMULATOR
 * Connects as 'theego084' and simulates an active charging session.
 */

const chargerId = 'theego084';
const ws = new WebSocket(`ws://localhost:3000/ocpp/ws/${chargerId}`);

ws.on('open', () => {
  console.log(`[Simulator] Connected to bridge as ${chargerId}`);

  // 1. Send BootNotification
  sendCall('BootNotification', {
    chargePointVendor: 'Energy Palace',
    chargePointModel: 'EP-Fast-01'
  });

  // 2. Start Charging Session
  setTimeout(() => {
    console.log('[Simulator] Simulating status: Preparing...');
    sendCall('StatusNotification', { connectorId: 1, errorCode: 'NoError', status: 'Preparing' });

    setTimeout(() => {
      console.log('[Simulator] Simulating status: Charging...');
      sendCall('StatusNotification', { connectorId: 1, errorCode: 'NoError', status: 'Charging' });
      startSimulatingMeterValues();
    }, 2000);
  }, 2000);
});

function sendCall(action, payload) {
  const messageId = Math.random().toString(36).substring(7);
  ws.send(JSON.stringify([2, messageId, action, payload]));
}

function startSimulatingMeterValues() {
  let soc = 40.0;

  setInterval(() => {
    // Simulated values as requested
    const voltage = 398 + Math.random() * 4; // Around 400V
    const power = 14.8 + Math.random() * 0.4;  // Around 15kW
    const current = (power * 1000) / voltage;

    soc += 0.05; // Increment SoC
    if (soc > 80) soc = 40; // Reset for loop testing

    sendCall('MeterValues', {
      connectorId: 1,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [
          { value: power.toFixed(2), unit: 'kW', measurand: 'Power.Active.Import' },
          { value: voltage.toFixed(1), unit: 'V', measurand: 'Voltage' },
          { value: current.toFixed(1), unit: 'A', measurand: 'Current.Import' },
          { value: soc.toFixed(2), unit: 'Percent', measurand: 'SoC' }
        ]
      }]
    });
  }, 3000); // Send every 3 seconds
}

ws.on('message', (data) => console.log('[Simulator] Response:', data.toString()));
ws.on('error', (err) => console.error('[Simulator] Error:', err));
