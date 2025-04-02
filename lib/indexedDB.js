const DB_NAME = "StockDB";
const STORE_NAME = "stocks";

// Open IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "date" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save Stock Data
export async function saveStockData(symbol, stockData) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  stockData.forEach((data) => store.put({ ...data, symbol }));
  return tx.complete;
}

// Retrieve Stock Data
export async function getStockData(symbol) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const allStocks = await store.getAll();

  return allStocks.filter((stock) => stock.symbol === symbol);
}
