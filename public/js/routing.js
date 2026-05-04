/**
 * SmartBin — Route Visualization Module
 * Handles route optimization requests and draws animated polylines on the map.
 */

const SmartRouting = (() => {
  let routeLayer = null;
  let routeMarkers = [];

  async function calculateRoute() {
    const btn = document.getElementById('btn-optimize');
    btn.disabled = true;
    btn.innerHTML = `<svg class="spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Calculating...`;

    try {
      const res = await fetch('/api/route/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const data = await res.json();

      if (!data.orderedStops || data.orderedStops.length === 0) {
        SmartDashboard.showToast('No bins need collection right now.', 'info');
        resetButton();
        return;
      }

      drawRoute(data);
      showRouteSummary(data);
      showRouteSteps(data);

      document.getElementById('btn-clear-route').style.display = 'block';
      SmartDashboard.showToast(`Route calculated: ${data.stopCount} stops, ${data.totalDistance}m`, 'success');

    } catch (err) {
      console.error('[Route] Error:', err);
      SmartDashboard.showToast('Failed to calculate route', 'danger');
    }

    resetButton();
  }

  function resetButton() {
    const btn = document.getElementById('btn-optimize');
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg> Calculate Optimal Route`;
  }

  function drawRoute(data) {
    clearRoute();

    const map = SmartMap.getMap();
    if (!map || !data.coordinates || data.coordinates.length < 2) return;

    const latlngs = data.coordinates.map(c => [c.lat, c.lng]);

    // Animated dashed route line
    routeLayer = L.polyline(latlngs, {
      color: '#00d4aa',
      weight: 4,
      opacity: 0.9,
      dashArray: '12, 8',
      lineCap: 'round',
      lineJoin: 'round',
      className: 'route-polyline'
    }).addTo(map);

    // Add glow effect line underneath
    const glowLine = L.polyline(latlngs, {
      color: '#00d4aa',
      weight: 12,
      opacity: 0.15,
      lineCap: 'round',
      lineJoin: 'round'
    }).addTo(map);
    routeMarkers.push(glowLine);

    // Add numbered stop markers
    data.orderedStops.forEach((stopId, index) => {
      const coord = data.coordinates.find(c => c.nodeId === stopId);
      if (!coord) return;

      const icon = L.divIcon({
        className: 'route-stop-marker',
        html: `<div style="
          width:28px;height:28px;border-radius:50%;
          background:linear-gradient(135deg,#00d4aa,#0099ff);
          color:#0a0e1a;font-weight:800;font-size:13px;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 12px rgba(0,212,170,0.4);
          border:2px solid rgba(255,255,255,0.3);
          font-family:'Inter',sans-serif;
        ">${index + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      const marker = L.marker([coord.lat, coord.lng], { icon, zIndexOffset: 1000 }).addTo(map);
      routeMarkers.push(marker);
    });

    // Fit map to route bounds
    map.fitBounds(routeLayer.getBounds().pad(0.15), { duration: 1 });

    // Animate dash offset
    animateRoute();
  }

  function animateRoute() {
    const el = document.querySelector('.route-polyline');
    if (el) {
      el.style.animation = 'route-dash 1.5s linear infinite';
    }
  }

  function clearRoute() {
    const map = SmartMap.getMap();
    if (!map) return;

    if (routeLayer) {
      map.removeLayer(routeLayer);
      routeLayer = null;
    }

    routeMarkers.forEach(m => map.removeLayer(m));
    routeMarkers = [];

    document.getElementById('route-summary').style.display = 'none';
    document.getElementById('route-steps').innerHTML = '';
    document.getElementById('btn-clear-route').style.display = 'none';
  }

  function showRouteSummary(data) {
    const el = document.getElementById('route-summary');
    el.style.display = 'grid';
    document.getElementById('route-stops').textContent = data.stopCount;
    document.getElementById('route-distance').textContent = data.totalDistance >= 1000 
      ? `${(data.totalDistance / 1000).toFixed(1)}km` 
      : `${data.totalDistance}m`;
    document.getElementById('route-time').textContent = `${data.estimatedMinutes} min`;
  }

  function showRouteSteps(data) {
    const container = document.getElementById('route-steps');
    container.innerHTML = '';

    // Start
    const startStep = document.createElement('div');
    startStep.className = 'route-step';
    startStep.innerHTML = `
      <div class="route-step__number" style="background:var(--info)">🏠</div>
      <span class="route-step__name">Depot (Start)</span>
    `;
    container.appendChild(startStep);

    data.segments.forEach((seg, i) => {
      const step = document.createElement('div');
      step.className = 'route-step';
      step.innerHTML = `
        <div class="route-step__number">${i + 1}</div>
        <span class="route-step__name">${seg.toLabel}</span>
        <span class="route-step__dist">${seg.distance}m</span>
      `;
      step.addEventListener('click', () => {
        const bin = seg.bin;
        if (bin) SmartMap.flyTo(bin.lat, bin.lng, 19);
      });
      container.appendChild(step);
    });
  }

  return { calculateRoute, clearRoute };
})();
