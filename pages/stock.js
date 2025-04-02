import { useState } from "react";
import { saveStockData, getStockData } from "../lib/indexedDB";
import StockTable from "../components/StockTable";

export default function Stocks() {
  const [symbol, setSymbol] = useState("");
  const [stocks, setStocks] = useState([]);

  async function fetchStockData() {
    if (!symbol) return;

    const response = await fetch(`https://api.example.com/stocks?symbol=${symbol}`);
    const data = await response.json();
    
    await saveStockData(symbol, data);
    setStocks(data);
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
        placeholder="Enter Stock Symbol" 
        value={symbol} 
        onChange={(e) => setSymbol(e.target.value.toUpperCase())} 
      />
      <button onClick={fetchStockData}>Fetch & Store</button>
      <button onClick={loadStockData}>Load from IndexedDB</button>

      <StockTable stocks={stocks} />
    </div>
  );
}
