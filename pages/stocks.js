import { useState } from "react";
import { saveStockData, getStockData } from "../lib/indexedDB";
import StockTable from "../components/StockTable";
import yahooFinance from "yahoo-finance2";

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchStockData() {
    if (!symbol) return;
    setLoading(true);

    try {
      const data = await yahooFinance.historical(symbol, { period1: "2023-01-01", period2: "2024-04-01", interval: "1d" });
      const formattedData = data.map((item) => ({
        date: item.date,
        symbol,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close
      }));

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
