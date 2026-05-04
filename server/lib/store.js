/**
 * SmartBin — In-Memory Bin State Store
 * Stores all trash bin states and provides CRUD operations.
 * Pre-seeded with demo bins placed across IMU Göztepe campus.
 */

const FULL_THRESHOLD = 80; // percentage

class BinStore {
  constructor() {
    this.bins = new Map();
    this.listeners = [];
    this._seedDemoBins();
  }

  /**
   * Pre-seed with demo bins across Istanbul Medeniyet University campus
   * Coordinates are placed around the Göztepe North Campus (library area)
   */
  _seedDemoBins() {
    const demoBins = [
      {
        id: 'BIN-001',
        name: 'Library Entrance',
        lat: 40.99565,
        lng: 29.06215,
        fill_level: 23,
        battery: 95,
        temperature: 22.5,
        status: 'ok',
        lastPing: Date.now() - 120000
      },
      {
        id: 'BIN-002',
        name: 'Cafeteria',
        lat: 40.99510,
        lng: 29.06320,
        fill_level: 87,
        battery: 78,
        temperature: 25.1,
        status: 'full',
        lastPing: Date.now() - 60000
      },
      {
        id: 'BIN-003',
        name: 'A Block Entrance',
        lat: 40.99620,
        lng: 29.06150,
        fill_level: 45,
        battery: 88,
        temperature: 21.3,
        status: 'ok',
        lastPing: Date.now() - 300000
      },
      {
        id: 'BIN-004',
        name: 'B Block Walkway',
        lat: 40.99480,
        lng: 29.06100,
        fill_level: 92,
        battery: 62,
        temperature: 23.8,
        status: 'full',
        lastPing: Date.now() - 45000
      },
      {
        id: 'BIN-005',
        name: 'Parking Lot',
        lat: 40.99670,
        lng: 29.06350,
        fill_level: 15,
        battery: 99,
        temperature: 20.1,
        status: 'ok',
        lastPing: Date.now() - 180000
      },
      {
        id: 'BIN-006',
        name: 'Student Garden',
        lat: 40.99530,
        lng: 29.06450,
        fill_level: 73,
        battery: 71,
        temperature: 24.2,
        status: 'warning',
        lastPing: Date.now() - 90000
      },
      {
        id: 'BIN-007',
        name: 'C Block South',
        lat: 40.99430,
        lng: 29.06250,
        fill_level: 56,
        battery: 83,
        temperature: 22.0,
        status: 'warning',
        lastPing: Date.now() - 200000
      },
      {
        id: 'BIN-008',
        name: 'Main Gate',
        lat: 40.99700,
        lng: 29.06280,
        fill_level: 8,
        battery: 97,
        temperature: 19.8,
        status: 'ok',
        lastPing: Date.now() - 600000
      },
      {
        id: 'BIN-009',
        name: 'Sports Area',
        lat: 40.99450,
        lng: 29.06400,
        fill_level: 95,
        battery: 45,
        temperature: 26.3,
        status: 'full',
        lastPing: Date.now() - 30000
      },
      {
        id: 'BIN-010',
        name: 'Library Back',
        lat: 40.99590,
        lng: 29.06330,
        fill_level: 34,
        battery: 91,
        temperature: 21.7,
        status: 'ok',
        lastPing: Date.now() - 240000
      }
    ];

    demoBins.forEach(bin => this.bins.set(bin.id, bin));
  }

  /**
   * Get all bins as array
   */
  getAll() {
    return Array.from(this.bins.values());
  }

  /**
   * Get a single bin by ID
   */
  get(id) {
    return this.bins.get(id) || null;
  }

  /**
   * Update bin status from ESP32 ping
   */
  updateFromPing(id, data) {
    let bin = this.bins.get(id);
    if (!bin) {
      return null;
    }

    const oldStatus = bin.status;

    bin.fill_level = data.fill_level !== undefined ? data.fill_level : bin.fill_level;
    bin.battery = data.battery !== undefined ? data.battery : bin.battery;
    bin.temperature = data.temperature !== undefined ? data.temperature : bin.temperature;
    bin.lastPing = Date.now();

    // Update status based on fill level
    if (bin.fill_level >= FULL_THRESHOLD) {
      bin.status = 'full';
    } else if (bin.fill_level >= 50) {
      bin.status = 'warning';
    } else {
      bin.status = 'ok';
    }

    this.bins.set(id, bin);

    // Notify listeners
    const becameFull = bin.status === 'full' && oldStatus !== 'full';
    this._notifyListeners({ type: 'update', bin, becameFull });

    return bin;
  }

  /**
   * Register a new bin
   */
  register(id, data) {
    const bin = {
      id,
      name: data.name || `Bin ${id}`,
      lat: data.lat,
      lng: data.lng,
      fill_level: 0,
      battery: 100,
      temperature: 20.0,
      status: 'ok',
      lastPing: Date.now()
    };

    this.bins.set(id, bin);
    this._notifyListeners({ type: 'register', bin });
    return bin;
  }

  /**
   * Mark bin as emptied
   */
  markEmptied(id) {
    const bin = this.bins.get(id);
    if (!bin) return null;

    bin.fill_level = 0;
    bin.status = 'ok';
    bin.lastPing = Date.now();

    this.bins.set(id, bin);
    this._notifyListeners({ type: 'emptied', bin });
    return bin;
  }

  /**
   * Get bins that are full (above threshold)
   */
  getFullBins() {
    return this.getAll().filter(b => b.fill_level >= FULL_THRESHOLD);
  }

  /**
   * Add a listener for bin changes (used by WebSocket broadcaster)
   */
  onChange(listener) {
    this.listeners.push(listener);
  }

  _notifyListeners(event) {
    this.listeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error('Listener error:', e); }
    });
  }
}

module.exports = new BinStore();
