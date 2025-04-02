import { useState } from "react";
import { saveStockData, getStockData } from "../lib/indexedDB";
import StockTable from "../components/StockTable";
import * as yahooFinance from "yahoo-finance2"; // ✅ Correct Import

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(false);

  async function fetchStockData() {
    if (!symbol) return;
    setLoading(true);

    try {
      console.log(`Fetching data for: ${symbol}`);

      // Fetch stock data
      const data = await yahooFinance.default.chart(symbol, {
        period1: "2023-01-01",
        period2: "2024-04-01",
        interval: "1d",
      });

      console.log("Raw API Response:", data);

      if (!data || !data.chart || !data.chart.result || data.chart.result.length === 0) {
        console.error("No data received. Check API response.");
        setLoading(false);
        return;
      }

      const stockInfo = data.chart.result[0];
      const timestamps = stockInfo.timestamp;
      const quotes = stockInfo.indicators.quote[0];

      if (!timestamps || !quotes) {
        console.error("Invalid data format.");
        setLoading(false);
        return;
      }

      // Format data
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
