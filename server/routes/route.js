/**
 * SmartBin — Route Optimization API
 * 
 * Uses Dijkstra's algorithm to calculate optimal collection routes
 * for visiting all full bins on campus.
 */

const express = require('express');
const router = express.Router();
const { optimizeRoute } = require('../lib/dijkstra');
const { campusGraph, nodeCoords } = require('../lib/graph');
const store = require('../lib/store');

// ─── POST /api/route/optimize — Calculate optimal collection route ───────────

router.post('/optimize', (req, res) => {
  const { bin_ids, depot } = req.body;

  // Default: collect all full bins. Or use specified bin_ids.
  let targetBins;
  if (bin_ids && Array.isArray(bin_ids) && bin_ids.length > 0) {
    targetBins = bin_ids;
  } else {
    targetBins = store.getFullBins().map(b => b.id);
  }

  if (targetBins.length === 0) {
    return res.json({
      message: 'No bins need collection',
      orderedStops: [],
      fullPath: [],
      totalDistance: 0,
      segments: [],
      coordinates: []
    });
  }

  // Verify all bins exist in the graph
  const missingNodes = targetBins.filter(id => !campusGraph[id]);
  if (missingNodes.length > 0) {
    return res.status(400).json({
      error: 'Some bins are not in the campus graph',
      missing: missingNodes
    });
  }

  const startNode = depot || 'DEPOT';
  if (!campusGraph[startNode]) {
    return res.status(400).json({ error: `Depot node '${startNode}' not found in graph` });
  }

  // Run route optimization
  const result = optimizeRoute(campusGraph, startNode, targetBins);

  // Convert path node IDs to coordinates for map rendering
  const coordinates = result.fullPath
    .filter(nodeId => nodeCoords[nodeId])
    .map(nodeId => ({
      nodeId,
      lat: nodeCoords[nodeId].lat,
      lng: nodeCoords[nodeId].lng,
      label: nodeCoords[nodeId].label
    }));

  // Build segment details with bin info
  const segments = result.segments.map(seg => ({
    ...seg,
    fromLabel: nodeCoords[seg.from]?.label || seg.from,
    toLabel: nodeCoords[seg.to]?.label || seg.to,
    bin: store.get(seg.to),
    coordinates: seg.path
      .filter(nodeId => nodeCoords[nodeId])
      .map(nodeId => ({
        lat: nodeCoords[nodeId].lat,
        lng: nodeCoords[nodeId].lng
      }))
  }));

  // Estimate time (assuming walking speed of 5 km/h = 83.3 m/min)
  const estimatedMinutes = Math.ceil(result.totalDistance / 83.3);

  res.json({
    orderedStops: result.orderedStops,
    fullPath: result.fullPath,
    totalDistance: result.totalDistance,
    estimatedMinutes,
    stopCount: result.orderedStops.length,
    segments,
    coordinates
  });
});

// ─── GET /api/route/graph — Get the campus graph for visualization ───────────

router.get('/graph', (req, res) => {
  const nodes = Object.entries(nodeCoords).map(([id, data]) => ({
    id,
    ...data
  }));

  const edges = [];
  const seen = new Set();
  for (const [nodeId, neighbors] of Object.entries(campusGraph)) {
    for (const { node: neighborId, weight } of neighbors) {
      const key = [nodeId, neighborId].sort().join('-');
      if (!seen.has(key)) {
        seen.add(key);
        edges.push({
          from: nodeId,
          to: neighborId,
          weight,
          fromCoords: nodeCoords[nodeId],
          toCoords: nodeCoords[neighborId]
        });
      }
    }
  }

  res.json({ nodes, edges });
});

module.exports = router;
