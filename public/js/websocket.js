/**
 * SmartBin — WebSocket Client Module
 * Maintains real-time connection to the server for live bin updates.
 */

const SmartWS = (() => {
  let ws = null;
  let reconnectTimer = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_DELAY = 30000;
  const listeners = [];

  function connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}`;

    try {
      ws = new WebSocket(url);
    } catch (e) {
      console.error('[WS] Connection error:', e);
      scheduleReconnect();
      return;
    }

    ws.onopen = () => {
      console.log('[WS] Connected');
      reconnectAttempts = 0;
      updateConnectionStatus(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleMessage(data);
      } catch (e) {
        console.error('[WS] Parse error:', e);
      }
    };

    ws.onclose = () => {
      console.log('[WS] Disconnected');
      updateConnectionStatus(false);
      scheduleReconnect();
    };

    ws.onerror = (err) => {
      console.error('[WS] Error:', err);
      updateConnectionStatus(false);
    };
  }

  function handleMessage(data) {
    listeners.forEach(fn => {
      try { fn(data); } catch (e) { console.error('[WS] Listener error:', e); }
    });
  }

  function onMessage(fn) {
    listeners.push(fn);
  }

  function scheduleReconnect() {
    if (reconnectTimer) return;
    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts - 1), MAX_RECONNECT_DELAY);
    console.log(`[WS] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function updateConnectionStatus(connected) {
    const el = document.getElementById('connection-status');
    if (!el) return;
    const dot = el.querySelector('.status-dot');
    const text = el.querySelector('.status-text');
    if (connected) {
      dot.className = 'status-dot status-dot--connected';
      text.textContent = 'Connected';
    } else {
      dot.className = 'status-dot status-dot--disconnected';
      text.textContent = 'Disconnected';
    }
  }

  return { connect, onMessage };
})();
