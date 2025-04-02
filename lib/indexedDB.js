const DB_NAME = "StockDataDB";
const STORE_NAME = "StockPrices";
const DB_VERSION = 1;

// Open IndexedDB
export async function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("symbol", "symbol", { unique: false });
        store.createIndex("date", "date", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// Save stock data
export async function saveStockData(symbol, stockData) {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readwrite");
  const store = transaction.objectStore(STORE_NAME);

  stockData.forEach((data) => {
    const id = `${symbol}_${data.date}`;
    store.put({ id, symbol, ...data });
  });

  return transaction.complete;
}

// Fetch stock data
export async function getStockData(symbol) {
  const db = await openDatabase();
  const transaction = db.transaction(STORE_NAME, "readonly");
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index("symbol");

  return new Promise((resolve, reject) => {
    const request = index.getAll(symbol);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
