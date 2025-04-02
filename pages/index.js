import { useState } from "react";
import { openDB } from "idb";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState("");
  const [symbolInput, setSymbolInput] = useState("");
  const [stockData, setStockData] = useState([]);

  const fetchAllData = async () => {
    setLoading(true);
    setProgress("Reading symbols.csv...");
    
    try {
      const response = await fetch("/symbols.csv");
      const text = await response.text();
      const symbols = text.split("\n").map((s) => s.trim()).filter(Boolean);

      const db = await openDB("StockDatabase", 1, {
        upgrade(db) {
          if (!db.objectStoreNames.contains("stocks")) {
            db.createObjectStore("stocks", { keyPath: "symbol" });
          }
        },
      });

      for (let i = 0; i < symbols.length; i++) {
        const symbol = symbols[i];
        setProgress(`Fetching data for: ${symbol} (${i + 1}/${symbols.length})`);

        try {
          const stockResponse = await fetch(`/api/fetchStock?symbol=${symbol}`);
          if (!stockResponse.ok) throw new Error(`Failed to fetch ${symbol}`);

          const stockData = await stockResponse.json();
          await db.put("stocks", { symbol, data: stockData });
        } catch (error) {
          console.error(`Skipping ${symbol}:`, error.message);
        }
      }
      
      setProgress("All symbols processed.");
    } catch (error) {
      console.error("Error reading symbols.csv:", error.message);
    }

    setLoading(false);
  };

  const loadFromIndexedDB = async () => {
    if (!symbolInput) return alert("Please enter a symbol to load.");
    const db = await openDB("StockDatabase", 1);
    const result = await db.get("stocks", symbolInput.toUpperCase());

    if (result) {
      setStockData(result.data.timestamp.map((timestamp, index) => ({
        date: new Date(timestamp * 1000).toISOString().split("T")[0],
        open: result.data.indicators.quote[0].open[index],
        high: result.data.indicators.quote[0].high[index],
        low: result.data.indicators.quote[0].low[index],
        close: result.data.indicators.quote[0].close[index],
        volume: result.data.indicators.quote[0].volume[index],
      })));
    } else {
      alert("Symbol not found in IndexedDB.");
    }
  };

  return (
    <div>
      <h1>Stock Data Fetcher</h1>

      <button onClick={fetchAllData} disabled={loading}>
        {loading ? "Fetching..." : "Fetch All Data"}
      </button>
      <p>{progress}</p>

      <hr />

      <input
        type="text"
        value={symbolInput}
        onChange={(e) => setSymbolInput(e.target.value)}
        placeholder="Enter symbol to load"
      />
      <button onClick={loadFromIndexedDB}>Load from IndexedDB</button>

      <hr />

      {stockData.length > 0 && (
        <table border="1">
          <thead>
            <tr>
              <th>Date</th>
              <th>Open</th>
              <th>High</th>
              <th>Low</th>
              <th>Close</th>
              <th>Volume</th>
            </tr>
          </thead>
          <tbody>
            {stockData.map((entry, index) => (
              <tr key={index}>
                <td>{entry.date}</td>
                <td>{entry.open}</td>
                <td>{entry.high}</td>
                <td>{entry.low}</td>
                <td>{entry.close}</td>
                <td>{entry.volume}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
