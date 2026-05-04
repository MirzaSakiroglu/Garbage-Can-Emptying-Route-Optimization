/**
 * SmartBin — Dijkstra's Shortest Path Algorithm
 * 
 * Implements Dijkstra's algorithm with a min-heap priority queue
 * for efficient shortest path calculation on the campus graph.
 * Also implements multi-stop route optimization using nearest-neighbor heuristic.
 */

// ─── Min-Heap Priority Queue ─────────────────────────────────────────────────

class MinHeap {
  constructor() {
    this.heap = [];
  }

  get size() {
    return this.heap.length;
  }

  push(node, priority) {
    this.heap.push({ node, priority });
    this._bubbleUp(this.heap.length - 1);
  }

  pop() {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop();
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this._sinkDown(0);
    }
    return min;
  }

  _bubbleUp(idx) {
    while (idx > 0) {
      const parent = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority >= this.heap[parent].priority) break;
      [this.heap[idx], this.heap[parent]] = [this.heap[parent], this.heap[idx]];
      idx = parent;
    }
  }

  _sinkDown(idx) {
    const length = this.heap.length;
    while (true) {
      let smallest = idx;
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === idx) break;
      [this.heap[idx], this.heap[smallest]] = [this.heap[smallest], this.heap[idx]];
      idx = smallest;
    }
  }
}

// ─── Dijkstra's Algorithm ────────────────────────────────────────────────────

/**
 * Find shortest path between two nodes in a weighted graph
 * @param {Object} graph - Adjacency list: { nodeId: [{ node, weight }, ...] }
 * @param {string} start - Start node ID
 * @param {string} end - End node ID
 * @returns {{ path: string[], distance: number }} - Shortest path and total distance
 */
function dijkstra(graph, start, end) {
  const distances = {};
  const previous = {};
  const visited = new Set();
  const pq = new MinHeap();

  // Initialize distances
  for (const node in graph) {
    distances[node] = node === start ? 0 : Infinity;
    previous[node] = null;
  }

  pq.push(start, 0);

  while (pq.size > 0) {
    const { node: current, priority: currentDist } = pq.pop();

    if (visited.has(current)) continue;
    visited.add(current);

    // Early exit if we reached the destination
    if (current === end) break;

    // Skip if we already found a better path
    if (currentDist > distances[current]) continue;

    // Examine neighbors
    const neighbors = graph[current] || [];
    for (const { node: neighbor, weight } of neighbors) {
      if (visited.has(neighbor)) continue;

      const newDist = distances[current] + weight;
      if (newDist < distances[neighbor]) {
        distances[neighbor] = newDist;
        previous[neighbor] = current;
        pq.push(neighbor, newDist);
      }
    }
  }

  // Reconstruct path
  const path = [];
  let current = end;
  while (current !== null) {
    path.unshift(current);
    current = previous[current];
  }

  // If no path found
  if (path[0] !== start) {
    return { path: [], distance: Infinity };
  }

  return {
    path,
    distance: distances[end]
  };
}

// ─── Multi-Stop Route Optimization ──────────────────────────────────────────

/**
 * Find optimal route visiting all specified stops using nearest-neighbor heuristic
 * combined with Dijkstra for inter-stop shortest paths.
 * 
 * @param {Object} graph - Adjacency list
 * @param {string} depot - Starting node (depot/base)
 * @param {string[]} stops - Array of node IDs that must be visited
 * @returns {{ orderedStops: string[], fullPath: string[], totalDistance: number, segments: Array }}
 */
function optimizeRoute(graph, depot, stops) {
  if (stops.length === 0) {
    return { orderedStops: [], fullPath: [depot], totalDistance: 0, segments: [] };
  }

  // For small number of stops (≤ 10), try nearest-neighbor heuristic
  const unvisited = new Set(stops);
  const orderedStops = [];
  const segments = [];
  let current = depot;
  let totalDistance = 0;
  let fullPath = [depot];

  while (unvisited.size > 0) {
    let nearestStop = null;
    let nearestResult = null;
    let nearestDist = Infinity;

    // Find nearest unvisited stop from current position
    for (const stop of unvisited) {
      const result = dijkstra(graph, current, stop);
      if (result.distance < nearestDist) {
        nearestDist = result.distance;
        nearestStop = stop;
        nearestResult = result;
      }
    }

    if (!nearestStop || nearestDist === Infinity) {
      // Can't reach remaining stops — add them as unreachable
      for (const stop of unvisited) {
        orderedStops.push(stop);
        segments.push({ from: current, to: stop, path: [], distance: Infinity, reachable: false });
      }
      break;
    }

    orderedStops.push(nearestStop);
    segments.push({
      from: current,
      to: nearestStop,
      path: nearestResult.path,
      distance: nearestDist,
      reachable: true
    });

    // Append path (skip first node to avoid duplicates)
    fullPath = fullPath.concat(nearestResult.path.slice(1));
    totalDistance += nearestDist;

    unvisited.delete(nearestStop);
    current = nearestStop;
  }

  return {
    orderedStops,
    fullPath,
    totalDistance,
    segments
  };
}

module.exports = { dijkstra, optimizeRoute, MinHeap };
