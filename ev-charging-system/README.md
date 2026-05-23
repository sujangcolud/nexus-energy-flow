# EV Charging System Bridge & Live Dashboard

This module provides a lightweight bridge between an EV Charger (OCPP 1.6 JSON) and a modern web dashboard.

## 1. Backend Setup (OCPP Server)

The backend acts as a Central System (CSMS) that your charger connects to.

### Prerequisites
- Node.js (v16+)
- npm

### Installation
1. Navigate to the backend directory:
   ```bash
   cd ev-charging-system/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```

### WebSocket URL for Charger
In your physical charger's configuration, set the **Central System URL** to:
`ws://your-server-ip:3000/ocpp/ws/YOUR_CHARGER_ID`

- Replace `your-server-ip` with your actual server IP or domain.
- Replace `YOUR_CHARGER_ID` with a unique identifier for your charger.

---

## 2. Frontend Setup (Dashboard)

The frontend is a standalone HTML/CSS/JS component that you can embed on your website.

### Configuration
1. Open `ev-charging-system/frontend/script.js`.
2. Update the `SERVER_URL` constant to point to your backend:
   ```javascript
   const SERVER_URL = 'http://your-server-ip:3000';
   ```

### Usage
Simply open `ev-charging-system/frontend/index.html` in a browser or host it on any static file server (Netlify, Vercel, etc.).

---

## 3. Testing with Mock Charger

If you don't have the physical charger connected yet, you can use the included mock script:

1. Ensure the backend is running.
2. Run the mock charger:
   ```bash
   node ev-charging-system/backend/mock-charger.js
   ```
3. Open the `index.html` to see the live data flowing.

## How it Works
1. **OCPP Bridge:** The Node.js server handles the WebSocket connection from the charger, parses OCPP 1.6 JSON messages (`BootNotification`, `StatusNotification`, `MeterValues`), and extracts key metrics (kW, Voltage, Current, SoC).
2. **Real-time Broadcast:** Extracted metrics are instantly broadcast to all connected web clients using Socket.IO.
3. **Live Dashboard:** The frontend listens for `transactionUpdate` events and updates the UI and the ApexCharts graph in real-time without refreshing.
