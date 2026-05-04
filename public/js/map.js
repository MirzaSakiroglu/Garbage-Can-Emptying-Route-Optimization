/**
 * SmartBin — Leaflet Map Module
 * Initializes satellite map centered on IMU campus with custom bin markers.
 */

const SmartMap = (() => {
  let map = null;
  const markers = {};
  let depotMarker = null;

  const CAMPUS_CENTER = [40.9955, 29.0625];
  const DEFAULT_ZOOM = 17;

  const DEPOT_COORDS = [40.9971, 29.0625];

  function init() {
    map = L.map('map', {
      center: CAMPUS_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      maxZoom: 19,
      minZoom: 14
    });

    // Satellite tile layer (Esri World Imagery — free, no API key)
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: ''
    }).addTo(map);

    // Add labels overlay for street names
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    // Place names overlay
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19
    }).addTo(map);

    // Add depot marker
    addDepotMarker();

    return map;
  }

  function addDepotMarker() {
    const icon = L.divIcon({
      className: 'bin-marker-wrapper',
      html: `<div class="bin-marker bin-marker--depot"><span class="bin-marker__icon">🏠</span></div>`,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
      popupAnchor: [0, -44]
    });

    depotMarker = L.marker(DEPOT_COORDS, { icon }).addTo(map);
    depotMarker.bindPopup(`
      <div class="popup-content">
        <div class="popup-header">
          <div class="popup-header__dot" style="background: var(--info)"></div>
          <div>
            <div class="popup-header__name">Collection Depot</div>
            <div class="popup-header__id">Starting Point</div>
          </div>
        </div>
        <p style="font-size:12px;color:var(--text-muted);">Vehicle starting point for optimized collection routes.</p>
      </div>
    `);
  }

  function getStatusClass(bin) {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    if (bin.lastPing < fiveMinAgo) return 'offline';
    return bin.status;
  }

  function getStatusColor(status) {
    switch (status) {
      case 'ok': return '#00d4aa';
      case 'warning': return '#ffb800';
      case 'full': return '#ff3b5c';
      default: return '#64748b';
    }
  }

  function getFillBarColor(level) {
    if (level >= 80) return '#ff3b5c';
    if (level >= 50) return '#ffb800';
    return '#00d4aa';
  }

  function getMarkerIcon(bin) {
    const statusClass = getStatusClass(bin);
    const emoji = statusClass === 'full' ? '⚠' : '🗑';
    return L.divIcon({
      className: 'bin-marker-wrapper',
      html: `<div class="bin-marker bin-marker--${statusClass}"><span class="bin-marker__icon">${emoji}</span></div>`,
      iconSize: [36, 44],
      iconAnchor: [18, 44],
      popupAnchor: [0, -44]
    });
  }

  function createPopupContent(bin) {
    const statusClass = getStatusClass(bin);
    const statusColor = getStatusColor(statusClass);
    const fillColor = getFillBarColor(bin.fill_level);
    const lastPingText = timeAgo(bin.lastPing);

    return `
      <div class="popup-content">
        <div class="popup-header">
          <div class="popup-header__dot" style="background: ${statusColor}; box-shadow: 0 0 8px ${statusColor}40"></div>
          <div>
            <div class="popup-header__name">${bin.name}</div>
            <div class="popup-header__id">${bin.id}</div>
          </div>
        </div>
        <div class="popup-stats">
          <div class="popup-stat">
            <div class="popup-stat__label">Fill Level</div>
            <div class="popup-stat__value" style="color:${fillColor}">${bin.fill_level}%</div>
          </div>
          <div class="popup-stat">
            <div class="popup-stat__label">Battery</div>
            <div class="popup-stat__value">${bin.battery}%</div>
          </div>
          <div class="popup-stat">
            <div class="popup-stat__label">Temperature</div>
            <div class="popup-stat__value">${bin.temperature}°C</div>
          </div>
          <div class="popup-stat">
            <div class="popup-stat__label">Status</div>
            <div class="popup-stat__value" style="color:${statusColor};font-size:13px;text-transform:uppercase">${statusClass}</div>
          </div>
        </div>
        <div class="popup-fill-bar">
          <div class="popup-fill-bar__inner" style="width:${bin.fill_level}%;background:${fillColor}"></div>
        </div>
        <div class="popup-actions">
          <button class="btn btn--primary" onclick="SmartDashboard.markEmptied('${bin.id}')">Mark as Emptied</button>
        </div>
        <div class="popup-lastping">Last ping: ${lastPingText}</div>
      </div>
    `;
  }

  function addOrUpdateMarker(bin) {
    if (markers[bin.id]) {
      markers[bin.id].setIcon(getMarkerIcon(bin));
      markers[bin.id].setPopupContent(createPopupContent(bin));
    } else {
      const marker = L.marker([bin.lat, bin.lng], {
        icon: getMarkerIcon(bin)
      }).addTo(map);

      marker.bindPopup(createPopupContent(bin));
      marker.on('click', () => marker.openPopup());
      markers[bin.id] = marker;
    }
  }

  function updateAllMarkers(bins) {
    bins.forEach(bin => addOrUpdateMarker(bin));
  }

  function flyTo(lat, lng, zoom) {
    map.flyTo([lat, lng], zoom || 18, { duration: 1 });
  }

  function getMap() { return map; }

  // Helper
  function timeAgo(timestamp) {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  return { init, addOrUpdateMarker, updateAllMarkers, flyTo, getMap, timeAgo };
})();
