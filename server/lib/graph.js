/**
 * SmartBin — Campus Pathway Graph
 * 
 * Defines the walkable/drivable pathway network of Istanbul Medeniyet University
 * Göztepe North Campus. Nodes are bin locations and pathway intersections.
 * Edge weights represent approximate walking distance in meters.
 * 
 * The graph is used by Dijkstra's algorithm to find optimal collection routes.
 */

// ─── Node Coordinates (for map visualization) ───────────────────────────────

const nodeCoords = {
  // Bin locations (match store.js)
  'BIN-001': { lat: 40.99565, lng: 29.06215, label: 'Library Entrance' },
  'BIN-002': { lat: 40.99510, lng: 29.06320, label: 'Cafeteria' },
  'BIN-003': { lat: 40.99620, lng: 29.06150, label: 'A Block Entrance' },
  'BIN-004': { lat: 40.99480, lng: 29.06100, label: 'B Block Walkway' },
  'BIN-005': { lat: 40.99670, lng: 29.06350, label: 'Parking Lot' },
  'BIN-006': { lat: 40.99530, lng: 29.06450, label: 'Student Garden' },
  'BIN-007': { lat: 40.99430, lng: 29.06250, label: 'C Block South' },
  'BIN-008': { lat: 40.99700, lng: 29.06280, label: 'Main Gate' },
  'BIN-009': { lat: 40.99450, lng: 29.06400, label: 'Sports Area' },
  'BIN-010': { lat: 40.99590, lng: 29.06330, label: 'Library Back' },

  // Pathway intersection nodes (for realistic routing)
  'INT-A': { lat: 40.99580, lng: 29.06220, label: 'Library Junction' },
  'INT-B': { lat: 40.99550, lng: 29.06300, label: 'Central Walkway' },
  'INT-C': { lat: 40.99600, lng: 29.06280, label: 'North Path' },
  'INT-D': { lat: 40.99500, lng: 29.06200, label: 'South Path' },
  'INT-E': { lat: 40.99480, lng: 29.06350, label: 'East Junction' },
  'INT-F': { lat: 40.99650, lng: 29.06300, label: 'North Gate Path' },
  'INT-G': { lat: 40.99470, lng: 29.06170, label: 'B Block Junction' },

  // Depot (collection vehicle starting point)
  'DEPOT': { lat: 40.99710, lng: 29.06250, label: 'Collection Depot' }
};

// ─── Helper: Calculate distance between two coordinates (Haversine) ─────────

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculate weight between two nodes using their coordinates
 * Adds a 20% factor to approximate walking path vs straight-line distance
 */
function calcWeight(nodeA, nodeB) {
  const a = nodeCoords[nodeA];
  const b = nodeCoords[nodeB];
  return Math.round(haversineDistance(a.lat, a.lng, b.lat, b.lng) * 1.2);
}

// ─── Build Adjacency List ───────────────────────────────────────────────────

function addEdge(graph, a, b) {
  const weight = calcWeight(a, b);
  if (!graph[a]) graph[a] = [];
  if (!graph[b]) graph[b] = [];
  graph[a].push({ node: b, weight });
  graph[b].push({ node: a, weight });
}

function buildCampusGraph() {
  const graph = {};

  // Initialize all nodes
  for (const nodeId in nodeCoords) {
    graph[nodeId] = [];
  }

  // ── Depot connections ──
  addEdge(graph, 'DEPOT', 'BIN-008');    // Depot → Main Gate
  addEdge(graph, 'DEPOT', 'INT-F');      // Depot → North Gate Path

  // ── Main Gate area ──
  addEdge(graph, 'BIN-008', 'INT-F');    // Main Gate → North Gate Path
  addEdge(graph, 'INT-F', 'BIN-005');    // North Gate Path → Parking Lot
  addEdge(graph, 'INT-F', 'INT-C');      // North Gate Path → North Path

  // ── Library area ──
  addEdge(graph, 'BIN-001', 'INT-A');    // Library Entrance → Library Junction
  addEdge(graph, 'INT-A', 'INT-C');      // Library Junction → North Path
  addEdge(graph, 'INT-A', 'INT-B');      // Library Junction → Central Walkway
  addEdge(graph, 'INT-A', 'INT-D');      // Library Junction → South Path
  addEdge(graph, 'BIN-010', 'INT-C');    // Library Back → North Path
  addEdge(graph, 'BIN-010', 'INT-B');    // Library Back → Central Walkway

  // ── A Block area ──
  addEdge(graph, 'BIN-003', 'INT-A');    // A Block → Library Junction
  addEdge(graph, 'BIN-003', 'INT-C');    // A Block → North Path

  // ── Central campus ──
  addEdge(graph, 'INT-B', 'BIN-002');    // Central Walkway → Cafeteria
  addEdge(graph, 'INT-B', 'INT-E');      // Central Walkway → East Junction
  addEdge(graph, 'INT-B', 'INT-D');      // Central Walkway → South Path
  addEdge(graph, 'INT-C', 'INT-B');      // North Path → Central Walkway

  // ── B Block area ──
  addEdge(graph, 'INT-D', 'INT-G');      // South Path → B Block Junction
  addEdge(graph, 'INT-G', 'BIN-004');    // B Block Junction → B Block Walkway
  addEdge(graph, 'INT-D', 'BIN-007');    // South Path → C Block South

  // ── East campus ──
  addEdge(graph, 'INT-E', 'BIN-006');    // East Junction → Student Garden
  addEdge(graph, 'INT-E', 'BIN-009');    // East Junction → Sports Area
  addEdge(graph, 'BIN-006', 'BIN-009'); // Student Garden → Sports Area

  // ── Cross connections for more routing options ──
  addEdge(graph, 'BIN-002', 'INT-E');    // Cafeteria → East Junction
  addEdge(graph, 'BIN-007', 'INT-G');    // C Block → B Block Junction
  addEdge(graph, 'BIN-005', 'INT-C');    // Parking → North Path

  return graph;
}

// Build once and export
const campusGraph = buildCampusGraph();

module.exports = { campusGraph, nodeCoords, haversineDistance };
