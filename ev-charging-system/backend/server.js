const express = require('express');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
const { WebSocketServer } = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new SocketServer(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Store active chargers
const chargers = new Map();

// Send initial status to new frontend connections
io.on('connection', (socket) => {
  console.log('Frontend client connected');
  chargers.forEach((data, chargerId) => {
    socket.emit('chargerStatus', {
      chargerId,
      status: data.status,
      details: data.details
    });
  });
});

// Helper to send OCPP response
const sendResponse = (ws, messageId, payload) => {
  ws.send(JSON.stringify([3, messageId, payload]));
};

const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
  const chargerId = req.url.split('/').pop();
  console.log(`Charger connected: ${chargerId}`);

  chargers.set(chargerId, {
    status: 'Online',
    lastSeen: new Date(),
    details: {}
  });

  io.emit('chargerStatus', { chargerId, status: 'Online' });

  ws.on('message', (data) => {
    try {
      const [messageTypeId, messageId, action, payload] = JSON.parse(data);

      if (messageTypeId === 2) { // CALL
        console.log(`Received ${action} from ${chargerId}`);

        handleOCPPCall(chargerId, ws, messageId, action, payload);
      }
    } catch (err) {
      console.error('Error parsing OCPP message:', err);
    }
  });

  ws.on('close', () => {
    console.log(`Charger disconnected: ${chargerId}`);
    chargers.delete(chargerId);
    io.emit('chargerStatus', { chargerId, status: 'Offline' });
  });
});

function handleOCPPCall(chargerId, ws, messageId, action, payload) {
  let responsePayload = {};

  switch (action) {
    case 'BootNotification':
      responsePayload = {
        status: 'Accepted',
        currentTime: new Date().toISOString(),
        interval: 300
      };
      if (chargers.has(chargerId)) {
        chargers.get(chargerId).details = payload;
      }
      io.emit('chargerStatus', { chargerId, status: 'Online', details: payload });
      break;

    case 'Heartbeat':
      responsePayload = {
        currentTime: new Date().toISOString()
      };
      chargers.get(chargerId).lastSeen = new Date();
      break;

    case 'StatusNotification':
      const chargerStatus = payload.status;
      chargers.get(chargerId).status = chargerStatus;
      io.emit('chargerUpdate', { chargerId, status: chargerStatus });
      break;

    case 'MeterValues':
      const metrics = extractMetrics(payload);
      io.emit('transactionUpdate', { chargerId, ...metrics });
      break;

    default:
      console.log(`Unhandled OCPP Action: ${action}`);
  }

  sendResponse(ws, messageId, responsePayload);
}

function extractMetrics(payload) {
  const metrics = {
    power: 0,
    voltage: 0,
    current: 0,
    soc: 0,
    timestamp: new Date().toISOString()
  };

  // OCPP 1.6 MeterValues can have multiple sampled values
  if (payload.meterValue && Array.isArray(payload.meterValue)) {
    payload.meterValue.forEach(mv => {
      if (mv.sampledValue && Array.isArray(mv.sampledValue)) {
        mv.sampledValue.forEach(sv => {
          const value = parseFloat(sv.value);
          const measurand = sv.measurand || 'Energy.Active.Import.Register'; // Default

          switch (measurand) {
            case 'Power.Active.Import':
              // Usually in Watts, convert to kW if needed
              metrics.power = sv.unit === 'W' ? value / 1000 : value;
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

// Upgrade HTTP server to WebSocket server for the specific path
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;

  if (pathname.startsWith('/ocpp/ws/')) {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

app.get('/', (req, res) => {
  res.send('OCPP Bridge Server is running.');
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`OCPP WebSocket Path: ws://localhost:${PORT}/ocpp/ws/:chargerId`);
});
