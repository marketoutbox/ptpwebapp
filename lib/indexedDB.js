import { openDB } from "idb";

const DB_NAME = "StockDatabase";
const STORE_NAME = "stocks";

async function getDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "symbol" });
      }
    },
  });
}

// Save stock data
export async function saveStockData(symbol, data) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  await store.put({ symbol, data }); // ✅ data is an array
  await tx.done;
}

// ✅ Fix here: return result.data instead of result
export async function getStockData(symbol) {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const result = await store.get(symbol);

  return result ? result.data : []; // ✅ Fix: return only the `data` array
}
