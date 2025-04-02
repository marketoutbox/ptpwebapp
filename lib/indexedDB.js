import { openDB } from "idb";

const DB_NAME = "StockDatabase"; // ✅ Database name
const STORE_NAME = "stocks";     // ✅ Object store name

// Open or create IndexedDB database
async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "symbol" });
      }
    },
  });
}

// Save stock data to IndexedDB
export async function saveStockData(symbol, data) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put({ symbol, data });
  await tx.done;
}

// Retrieve stock data from IndexedDB
export async function getStockData(symbol) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await store.get(symbol);
  return result ? result.data : [];
}

// Delete stock data for a symbol
export async function deleteStockData(symbol) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.delete(symbol);
  await tx.done;
}
