// Solitude & Ink — local IndexedDB layer.
// One DB, one object store per feature area. All stores are declared now
// (even for features built in later phases) so the schema never needs a
// version bump mid-project.

const DB_NAME = 'solitude-ink';
const DB_VERSION = 2;

const STORES = {
  journalEntries: 'date',      // keyPath: 'date' (YYYY-MM-DD), one entry per day
  habits: 'id',                // {id, name, frequency: 'daily'|'weekly', target, unit, count, lastResetAt}
  traits: 'id',                // {id, kind: 'strength'|'weakness', title, note, createdAt}
  listItems: 'id',             // {id, list, type: 'text'|'image'|'link', ...}
  zikrs: 'id',                 // {id, arabic, english, target, count, image}
  activityOptions: 'id',       // {id, label} — the hour-breakdown dropdown options
  meta: 'key'                  // small key/value store, e.g. journal streak cache
};

const DEFAULT_ACTIVITY_OPTIONS = [
  'Sleeping', 'Work', 'Watched YouTube', 'Exercise', 'Eating',
  'Commute', 'Reading', 'Screen time', 'Socializing', 'Chores'
];

let _dbPromise = null;

function openDB() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const tx = e.target.transaction;
      let activityStoreIsNew = false;
      Object.entries(STORES).forEach(([name, keyPath]) => {
        if (!db.objectStoreNames.contains(name)) {
          db.createObjectStore(name, { keyPath });
          if (name === 'activityOptions') activityStoreIsNew = true;
        }
      });
      if (activityStoreIsNew) {
        const store = tx.objectStore('activityOptions');
        DEFAULT_ACTIVITY_OPTIONS.forEach((label, i) => {
          store.put({ id: 'default-' + i, label, updatedAt: new Date().toISOString() });
        });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

const DB = {
  async put(storeName, value) {
    const db = await openDB();
    if (value && typeof value === 'object') {
      value.updatedAt = new Date().toISOString();
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(value);
      tx.onerror = () => reject(tx.error);
    });
  },

  async get(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async delete(storeName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  // Export everything to a plain object, for the JSON backup feature.
  async exportAll() {
    const out = {};
    for (const name of Object.keys(STORES)) {
      out[name] = await DB.getAll(name);
    }
    out._exportedAt = new Date().toISOString();
    return out;
  }
};

// Compute what an import would do, without writing anything.
// A record is added if its key doesn't exist locally yet; updated if it
// exists but the backup's copy is newer (by updatedAt); otherwise skipped
// because the local copy is already newer or the same.
async function computeMergePlan(data) {
  const plan = {}; // storeName -> { toWrite: [...], added, updated, skipped }
  for (const name of Object.keys(STORES)) {
    const incoming = Array.isArray(data[name]) ? data[name] : [];
    const existingAll = await DB.getAll(name);
    const existingByKey = new Map(existingAll.map(r => [r[STORES[name]], r]));
    const toWrite = [];
    let added = 0, updated = 0, skipped = 0;
    for (const rec of incoming) {
      const key = rec[STORES[name]];
      const existing = key !== undefined ? existingByKey.get(key) : undefined;
      if (!existing) {
        toWrite.push(rec);
        added++;
      } else {
        const incomingTime = rec.updatedAt ? new Date(rec.updatedAt).getTime() : 0;
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
        if (incomingTime > existingTime) {
          toWrite.push(rec);
          updated++;
        } else {
          skipped++;
        }
      }
    }
    plan[name] = { toWrite, added, updated, skipped };
  }
  return plan;
}

// Preview an import without writing anything — used to show a confirm
// dialog before committing.
DB.previewImport = async (data) => {
  const plan = await computeMergePlan(data);
  const summary = {};
  for (const [name, p] of Object.entries(plan)) {
    summary[name] = { added: p.added, updated: p.updated, skipped: p.skipped };
  }
  return summary;
};

// Merge import: keeps whichever copy of each record is newer. Existing
// local records not present in the backup are left untouched.
DB.importAll = async (data) => {
  const plan = await computeMergePlan(data);
  const summary = {};
  for (const [name, p] of Object.entries(plan)) {
    for (const rec of p.toWrite) {
      await DB.put(name, rec);
    }
    summary[name] = { added: p.added, updated: p.updated, skipped: p.skipped };
  }
  return summary;
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function todayKey(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
