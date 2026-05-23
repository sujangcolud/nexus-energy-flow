const express = require('express');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const { WebSocketServer } = require('ws');

/**
 * PRODUCTION-READY OCPP 1.6 BRIDGE SERVER
 * This server acts as a Central System (CSMS) for EV Chargers.
 */

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 3000;

// Store active charger states
const chargers = new Map();

// Socket.IO: Handle frontend connections
io.on('connection', (socket) => {
  console.log('Frontend dashboard connected');
  // Send current state of all chargers to new dashboard connections
  chargers.forEach((data, chargerId) => {
    socket.emit('transactionUpdate', data);
  });
});

// Helper to send OCPP response (Type 3: CALLRESULT)
const sendResponse = (ws, messageId, payload) => {
  ws.send(JSON.stringify([3, messageId, payload]));
};

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  // Extract chargerId from URL: /ocpp/ws/theego084
  const chargerId = req.url.split('/').filter(Boolean).pop();
  console.log(`Charger connected: ${chargerId}`);

  // Initialize state
  const state = {
    chargerId,
    status: 'Online',
    powerKw: 0,
    voltage: 0,
    current: 0,
    soc: 0,
    timestamp: new Date().toISOString()
  };
  chargers.set(chargerId, state);

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      const [messageTypeId, messageId, action, payload] = message;

      if (messageTypeId === 2) { // CALL
        console.log(`[OCPP] Received ${action} from ${chargerId}`);
        handleOCPPCall(chargerId, ws, messageId, action, payload);
      }
    } catch (err) {
      console.error('OCPP Parsing Error:', err);
    }
  });

  ws.on('close', () => {
    console.log(`Charger disconnected: ${chargerId}`);
    if (chargers.has(chargerId)) {
      const state = chargers.get(chargerId);
      state.status = 'Offline';
      state.timestamp = new Date().toISOString();
      io.emit('transactionUpdate', state);
      chargers.delete(chargerId);
    }
  });
});

function handleOCPPCall(chargerId, ws, messageId, action, payload) {
  let responsePayload = {};
  const state = chargers.get(chargerId);

  switch (action) {
    case 'BootNotification':
      responsePayload = {
        status: 'Accepted',
        currentTime: new Date().toISOString(),
        interval: 300
      };
      state.status = 'Available';
      break;

    case 'Heartbeat':
      responsePayload = { currentTime: new Date().toISOString() };
      break;

    case 'StatusNotification':
      state.status = payload.status; // e.g., Available, Preparing, Charging, Finishing
      break;

    case 'MeterValues':
      const metrics = extractMetrics(payload);
      state.powerKw = metrics.powerKw;
      state.voltage = metrics.voltage;
      state.current = metrics.current;
      state.soc = metrics.soc;
      break;
  }

  state.timestamp = new Date().toISOString();
  // Broadcast updated state to all frontend clients
  io.emit('transactionUpdate', state);

  // Send OCPP Success Response
  sendResponse(ws, messageId, responsePayload);
}

/**
 * Extracts real-time metrics from standard OCPP 1.6 MeterValues payload
 */
function extractMetrics(payload) {
  const metrics = { powerKw: 0, voltage: 0, current: 0, soc: 0 };

  if (payload.meterValue && Array.isArray(payload.meterValue)) {
    payload.meterValue.forEach(mv => {
      if (mv.sampledValue && Array.isArray(mv.sampledValue)) {
        mv.sampledValue.forEach(sv => {
          const value = parseFloat(sv.value);
          const measurand = sv.measurand || 'Energy.Active.Import.Register';

          switch (measurand) {
            case 'Power.Active.Import':
              metrics.powerKw = sv.unit === 'W' ? value / 1000 : value;
              break;
            case 'Voltage':
              metrics.voltage = value;
              break;
            case 'Current.Import':
              metrics.current = value;
              break;
            case 'SoC':
              metrics.soc = value;
              break;
          }
        });
      }
    });
  }
  return metrics;
}

// Attach WebSocket server to Express path
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  if (pathname.includes('/ocpp/ws/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  }
  // Let Socket.IO handle other upgrade requests (e.g., /socket.io/)
});

app.get('/', (req, res) => res.send('EV Charging CSMS Bridge is Active.'));

server.listen(PORT, () => {
  console.log(`Bridge Server running on port ${PORT}`);
  console.log(`OCPP WS Endpoint: ws://YOUR_IP:${PORT}/ocpp/ws/:chargerId`);
});
