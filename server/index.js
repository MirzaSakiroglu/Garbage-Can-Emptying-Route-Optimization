/**
 * SmartBin — Main Server
 * 
 * Express.js server with WebSocket support for real-time bin status updates.
 * Serves the dashboard frontend and provides REST API for ESP32 devices.
 */

const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const path = require('path');
const store = require('./lib/store');
const binsRouter = require('./routes/bins');
const routeRouter = require('./routes/route');

const PORT = process.env.PORT || 3000;

// ─── Express Setup ───────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));

// Mount API routes
app.use('/api/bins', binsRouter);
app.use('/api/route', routeRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// ─── HTTP + WebSocket Server ─────────────────────────────────────────────────

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track connected dashboard clients
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log(`[WS] Client connected. Total: ${clients.size}`);

  // Send current state on connect
  ws.send(JSON.stringify({
    type: 'init',
    bins: store.getAll()
  }));

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`[WS] Client disconnected. Total: ${clients.size}`);
  });

  ws.on('error', (err) => {
    console.error('[WS] Client error:', err.message);
    clients.delete(ws);
  });
});

// Broadcast bin changes to all connected dashboards
function broadcast(data) {
  const message = JSON.stringify(data);
  for (const client of clients) {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(message);
    }
  }
}

// Listen for store changes and broadcast
store.onChange((event) => {
  broadcast({
    type: event.type,
    bin: event.bin,
    becameFull: event.becameFull || false,
    timestamp: Date.now()
  });

  if (event.becameFull) {
    console.log(`[ALERT] Bin ${event.bin.id} (${event.bin.name}) is FULL at ${event.bin.fill_level}%!`);
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  console.log('');
  console.log('  ╔══════════════════════════════════════════════════╗');
  console.log('  ║                                                  ║');
  console.log('  ║   🗑️  SmartBin Server                            ║');
  console.log('  ║   Istanbul Medeniyet University                  ║');
  console.log('  ║                                                  ║');
  console.log(`  ║   Dashboard:  http://localhost:${PORT}              ║`);
  console.log(`  ║   API:        http://localhost:${PORT}/api/bins     ║`);
  console.log(`  ║   WebSocket:  ws://localhost:${PORT}               ║`);
  console.log('  ║                                                  ║');
  console.log('  ╚══════════════════════════════════════════════════╝');
  console.log('');
  console.log(`  ${store.getAll().length} bins loaded (${store.getFullBins().length} full)`);
  console.log('');
});
