/**
 * SmartBin — Main Application Bootstrap
 * Initializes all modules and coordinates data flow.
 */

(function() {
  'use strict';

  // Initialize map
  SmartMap.init();

  // Initialize dashboard UI
  SmartDashboard.init();

  // Load initial data via REST
  fetch('/api/bins')
    .then(res => res.json())
    .then(data => {
      SmartDashboard.setBins(data.bins);
      console.log(`[App] Loaded ${data.count} bins (${data.full_count} full)`);
    })
    .catch(err => {
      console.error('[App] Failed to load bins:', err);
      SmartDashboard.showToast('Failed to load bin data', 'danger');
    });

  // Connect WebSocket for real-time updates
  SmartWS.connect();

  // Handle WebSocket messages
  SmartWS.onMessage((data) => {
    switch (data.type) {
      case 'init':
        SmartDashboard.setBins(data.bins);
        break;

      case 'update':
        SmartDashboard.updateBin(data.bin);
        if (data.becameFull) {
          SmartDashboard.addActivity('full', data.bin);
          SmartDashboard.showToast(
            `🚨 ${data.bin.name} is FULL (${data.bin.fill_level}%)`,
            'danger',
            6000
          );
        } else {
          SmartDashboard.addActivity('update', data.bin);
        }
        break;

      case 'emptied':
        SmartDashboard.updateBin(data.bin);
        SmartDashboard.addActivity('emptied', data.bin);
        break;

      case 'register':
        SmartDashboard.updateBin(data.bin);
        SmartDashboard.addActivity('register', data.bin);
        SmartDashboard.showToast(`New bin registered: ${data.bin.name}`, 'info');
        break;
    }
  });

  console.log('[App] SmartBin Dashboard initialized');
})();
