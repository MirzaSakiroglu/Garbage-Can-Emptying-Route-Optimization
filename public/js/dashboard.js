/**
 * SmartBin — Dashboard Module
 * Stats, bin list, activity feed, and notifications.
 */
const SmartDashboard = (() => {
  let bins = [];
  const activityLog = [];
  let alertCount = 0;

  function init() {
    document.getElementById('btn-optimize').addEventListener('click', SmartRouting.calculateRoute);
    document.getElementById('btn-clear-route').addEventListener('click', SmartRouting.clearRoute);
    document.getElementById('bin-filter').addEventListener('change', renderBinList);
    updateClock();
    setInterval(updateClock, 1000);
  }

  function updateClock() {
    const el = document.getElementById('current-time');
    if (el) el.textContent = new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
  }

  function setBins(binData) {
    bins = binData;
    updateStats();
    renderBinList();
    SmartMap.updateAllMarkers(bins);
  }

  function updateBin(binData) {
    const i = bins.findIndex(b => b.id === binData.id);
    if (i >= 0) bins[i] = binData; else bins.push(binData);
    updateStats();
    renderBinList();
    SmartMap.addOrUpdateMarker(binData);
  }

  function updateStats() {
    const total = bins.length;
    const full = bins.filter(b => b.status === 'full').length;
    const avg = total > 0 ? Math.round(bins.reduce((s,b) => s + b.fill_level, 0) / total) : 0;
    const online = bins.filter(b => b.lastPing > Date.now() - 300000).length;
    document.getElementById('total-bins').textContent = total;
    document.getElementById('full-bins').textContent = full;
    document.getElementById('avg-fill').textContent = avg + '%';
    document.getElementById('online-bins').textContent = online;
    alertCount = full;
    const badge = document.getElementById('alerts-count');
    badge.textContent = alertCount;
    badge.style.display = alertCount > 0 ? 'flex' : 'none';
  }

  function renderBinList() {
    const filter = document.getElementById('bin-filter').value;
    const container = document.getElementById('bin-list');
    container.innerHTML = '';
    let filtered = filter === 'all' ? bins : bins.filter(b => b.status === filter);
    filtered.sort((a, b) => {
      const o = { full:0, warning:1, ok:2 };
      return (o[a.status]??3) - (o[b.status]??3) || b.fill_level - a.fill_level;
    });
    if (!filtered.length) { container.innerHTML = '<div class="activity-empty">No bins match</div>'; return; }
    filtered.forEach(bin => {
      const item = document.createElement('div');
      item.className = 'bin-item';
      const c = bin.fill_level >= 80 ? '#ff3b5c' : bin.fill_level >= 50 ? '#ffb800' : '#00d4aa';
      item.innerHTML = `
        <div class="bin-item__status bin-item__status--${bin.status}"></div>
        <div class="bin-item__info">
          <div class="bin-item__name">${bin.name}</div>
          <div class="bin-item__meta">${bin.id} · ${SmartMap.timeAgo(bin.lastPing)}</div>
        </div>
        <div class="bin-item__fill">
          <div class="bin-item__fill-value" style="color:${c}">${bin.fill_level}%</div>
          <div class="bin-item__fill-bar"><div class="bin-item__fill-bar-inner" style="width:${bin.fill_level}%;background:${c}"></div></div>
        </div>`;
      item.addEventListener('click', () => SmartMap.flyTo(bin.lat, bin.lng, 19));
      container.appendChild(item);
    });
  }

  function addActivity(type, bin) {
    const icons = { update:'📡', full:'🚨', emptied:'✅', register:'➕' };
    const cls = { update:'update', full:'full', emptied:'emptied', register:'update' };
    const texts = { full:`<strong>${bin.name}</strong> is full (${bin.fill_level}%)`, emptied:`<strong>${bin.name}</strong> emptied`, register:`<strong>${bin.name}</strong> registered` };
    const text = texts[type] || `<strong>${bin.name}</strong> → ${bin.fill_level}%`;
    activityLog.unshift({ text, icon: icons[type]||'📡', cls: cls[type]||'update', time: Date.now() });
    if (activityLog.length > 20) activityLog.pop();
    const container = document.getElementById('activity-feed');
    container.innerHTML = activityLog.slice(0,10).map(a => `
      <div class="activity-item">
        <div class="activity-item__icon activity-item__icon--${a.cls}">${a.icon}</div>
        <div class="activity-item__text">${a.text}</div>
        <div class="activity-item__time">${SmartMap.timeAgo(a.time)}</div>
      </div>`).join('');
  }

  function showToast(message, type='info', duration=4000) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const emojis = { danger:'🚨', success:'✅', info:'ℹ️' };
    toast.innerHTML = `<span class="toast__icon">${emojis[type]||'ℹ️'}</span><div class="toast__text">${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.classList.add('toast--exit'); setTimeout(() => toast.remove(), 300); }, duration);
  }

  async function markEmptied(binId) {
    try {
      const res = await fetch(`/api/bins/${binId}/emptied`, { method:'PUT' });
      if (res.ok) showToast(`${binId} marked as emptied`, 'success');
    } catch(e) { showToast('Failed to update bin', 'danger'); }
  }

  window.SmartDashboard = { markEmptied, showToast };
  return { init, setBins, updateBin, addActivity, showToast, markEmptied, renderBinList };
})();
