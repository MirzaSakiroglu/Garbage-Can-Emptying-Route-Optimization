/**
 * SmartBin — Bins REST API Routes
 * 
 * Handles ESP32 device communication and dashboard data requests.
 * All endpoints use JSON and support CORS for cross-origin ESP32 requests.
 */

const express = require('express');
const router = express.Router();
const store = require('../lib/store');

// Simple API key auth middleware
const API_KEY = process.env.SMARTBIN_API_KEY || 'smartbin-imu-2024';

function authMiddleware(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    return res.status(401).json({ error: 'Invalid or missing API key' });
  }
  next();
}

// ─── GET /api/bins — Get all bins ────────────────────────────────────────────

router.get('/', (req, res) => {
  const bins = store.getAll();
  res.json({
    count: bins.length,
    full_count: bins.filter(b => b.status === 'full').length,
    bins
  });
});

// ─── GET /api/bins/:id — Get single bin ──────────────────────────────────────

router.get('/:id', (req, res) => {
  const bin = store.get(req.params.id);
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found' });
  }
  res.json(bin);
});

// ─── POST /api/bins/:id/ping — ESP32 sends status update ────────────────────

router.post('/:id/ping', authMiddleware, (req, res) => {
  const { fill_level, battery, temperature } = req.body;

  if (fill_level === undefined || typeof fill_level !== 'number') {
    return res.status(400).json({ error: 'fill_level (number) is required' });
  }

  if (fill_level < 0 || fill_level > 100) {
    return res.status(400).json({ error: 'fill_level must be between 0 and 100' });
  }

  const bin = store.updateFromPing(req.params.id, { fill_level, battery, temperature });

  if (!bin) {
    return res.status(404).json({ error: 'Bin not found. Register first via POST /api/bins/:id/register' });
  }

  res.json({
    status: 'ok',
    bin
  });
});

// ─── POST /api/bins/:id/register — Register a new bin ────────────────────────

router.post('/:id/register', authMiddleware, (req, res) => {
  const { name, lat, lng } = req.body;

  if (lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'lat and lng are required' });
  }

  const bin = store.register(req.params.id, { name, lat, lng });
  res.status(201).json({
    status: 'registered',
    bin
  });
});

// ─── PUT /api/bins/:id/emptied — Mark bin as emptied ─────────────────────────

router.put('/:id/emptied', (req, res) => {
  const bin = store.markEmptied(req.params.id);
  if (!bin) {
    return res.status(404).json({ error: 'Bin not found' });
  }
  res.json({
    status: 'emptied',
    bin
  });
});

module.exports = router;
