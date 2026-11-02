const DB_NAME = "3d-calculator-db";
const DB_VERSION = 1;
const STORES = ["printers", "materials", "budgets", "settings"];

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const store of STORES) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: "id" });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function put(store, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(value);
    tx.oncomplete = () => resolve(value);
    tx.onerror = () => reject(tx.error);
  });
}

export async function remove(store, id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(id);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

export async function exportDatabase() {
  const data = {};
  for (const store of STORES) data[store] = await getAll(store);
  return {
    app: "3D Calculator",
    version: 1,
    exportedAt: new Date().toISOString(),
    data
  };
}

export async function importDatabase(payload) {
  if (!payload?.data || payload.app !== "3D Calculator") {
    throw new Error("Arquivo de backup inválido.");
  }
  for (const store of STORES) {
    for (const item of payload.data[store] || []) await put(store, item);
  }
}
