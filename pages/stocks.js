import { useState } from "react";
import { saveStockData, getStockData } from "../lib/indexedDB";
import StockTable from "../components/StockTable";

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchStockData() {
    if (!symbol) return;
    setLoading(true);

    try {
      console.log(`Fetching data for: ${symbol}`);

      const response = await fetch(`/api/stocks?symbol=${symbol}`);
      const data = await response.json();

      if (!data || !data.timestamp || !data.indicators?.quote?.[0]) {
        console.error("Invalid data format.");
        setLoading(false);
        return;
      }

      const timestamps = data.timestamp;
      const quotes = data.indicators.quote[0];

      const formattedData = timestamps.map((time, index) => ({
        date: new Date(time * 1000).toISOString().split("T")[0], // Convert timestamp to date
        symbol,
        open: quotes.open[index] || 0,
        high: quotes.high[index] || 0,
        low: quotes.low[index] || 0,
        close: quotes.close[index] || 0,
      }));

      console.log("Formatted Data:", formattedData);

      await saveStockData(symbol, formattedData);
      setStocks(formattedData);
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }

    setLoading(false);
  }

  async function loadStockData() {
    if (!symbol) return;
    const data = await getStockData(symbol);
    setStocks(data);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h1>Stock Data</h1>
      <input
        type="text"
        placeholder="Enter Stock Symbol (e.g. AAPL)"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
      />
      <button onClick={fetchStockData} disabled={loading}>
        {loading ? "Fetching..." : "Fetch & Store"}
      </button>
      <button onClick={loadStockData}>Load from IndexedDB</button>

      <StockTable stocks={stocks} />
    </div>
  );
}
