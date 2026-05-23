const WebSocket = require('ws');

const chargerId = 'TEST-CHARGER-001';
const ws = new WebSocket(`ws://localhost:3000/ocpp/ws/${chargerId}`);

ws.on('open', () => {
  console.log('Mock Charger: Connected to server');

  // 1. Send BootNotification
  sendCall('BootNotification', {
    chargePointVendor: 'Energy Palace',
    chargePointModel: 'EP-Fast-01'
  });

  // 2. Start periodic Heartbeats
  setInterval(() => {
    sendCall('Heartbeat', {});
  }, 10000);

  // 3. Simulate a Charging Session
  console.log('Mock Charger: Starting simulated session...');
  setTimeout(() => {
    sendCall('StatusNotification', {
      connectorId: 1,
      errorCode: 'NoError',
      status: 'Charging'
    });

    startSimulatingMeterValues();
  }, 2000);
});

function sendCall(action, payload) {
  const messageId = Math.random().toString(36).substring(7);
  const message = JSON.stringify([2, messageId, action, payload]);
  ws.send(message);
  console.log(`Mock Charger: Sent ${action}`);
}

function startSimulatingMeterValues() {
  let power = 7.2;
  let soc = 20;

  setInterval(() => {
    // fluctuate power slightly
    power = 7.0 + Math.random() * 0.5;
    soc += 0.1;
    if (soc > 100) soc = 100;

    sendCall('MeterValues', {
      connectorId: 1,
      meterValue: [{
        timestamp: new Date().toISOString(),
        sampledValue: [
          { value: power.toString(), unit: 'kW', measurand: 'Power.Active.Import' },
          { value: '230', unit: 'V', measurand: 'Voltage' },
          { value: (power * 1000 / 230).toFixed(1), unit: 'A', measurand: 'Current.Import' },
          { value: soc.toFixed(1), unit: 'Percent', measurand: 'SoC' }
        ]
      }]
    });
  }, 3000);
}

ws.on('message', (data) => {
  console.log('Mock Charger: Received from server:', data.toString());
});

ws.on('error', (err) => {
  console.error('Mock Charger: WebSocket error:', err);
});
