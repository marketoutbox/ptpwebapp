import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import { calculateZScore } from '../utils/calculations'; // Import Z-score calculation function

const Backtest = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedPair, setSelectedPair] = useState({ stockA: '', stockB: '' });
  const [backtestResult, setBacktestResult] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const db = await openDB('StockDatabase', 1);
        const tx = db.transaction('stocks', 'readonly');
        const store = tx.objectStore('stocks');
        const allStocks = await store.getAll();

        if (!allStocks.length) {
          console.warn("No stocks found in IndexedDB.");
          return;
        }

        const symbols = allStocks.map(stock => stock.symbol);
        setStocks(symbols);
      } catch (error) {
        console.error("Error fetching stocks:", error);
      }
    };

    fetchStocks();
  }, []);

  const handleSelection = (event) => {
    const { name, value } = event.target;
    setSelectedPair(prev => ({ ...prev, [name]: value }));
  };

  const runBacktest = async () => {
    if (!selectedPair.stockA || !selectedPair.stockB) {
      alert('Please select two stocks for pair trading.');
      return;
    }

    try {
      const db = await openDB('StockDatabase', 1);
      const tx = db.transaction('stocks', 'readonly');
      const store = tx.objectStore('stocks');

      const stockAData = await store.get(selectedPair.stockA);
      const stockBData = await store.get(selectedPair.stockB);

      if (!stockAData || !stockBData) {
        alert("Stock data not found in IndexedDB.");
        return;
      }

      const pricesA = stockAData.data.map(entry => ({ date: entry.date, close: entry.close }));
      const pricesB = stockBData.data.map(entry => ({ date: entry.date, close: entry.close }));
      
      window.pricesA = pricesA;
      window.pricesB = pricesB;

      console.log("Stock A Data:", pricesA);
      console.log("Stock B Data:", pricesB);

      // Compute Ratios
      const ratios = pricesA.map((a, i) => a.close / (pricesB[i]?.close || 1));
      window.ratios = ratios;
      console.log("First 5 Ratios:", ratios.slice(0, 5));

      // Compute Z-Scores
      const zScores = calculateZScore(ratios);
      window.zScores = zScores;
      console.log("First 5 Z-Scores:", zScores.slice(0, 5));

      setBacktestResult(`Backtest completed for ${selectedPair.stockA} and ${selectedPair.stockB}. Check console for data.`);
      
    } catch (error) {
      console.error("Error fetching stock data:", error);
    }
  };

  return (
    <div>
      <h1>Pair Trading Backtest</h1>
      <div>
        <label>Select Stock A: </label>
        <select name="stockA" onChange={handleSelection} value={selectedPair.stockA}>
          <option value="">-- Select --</option>
          {stocks.map(symbol => <option key={symbol} value={symbol}>{symbol}</option>)}
        </select>
      </div>
      <div>
        <label>Select Stock B: </label>
        <select name="stockB" onChange={handleSelection} value={selectedPair.stockB}>
          <option value="">-- Select --</option>
          {stocks.map(symbol => <option key={symbol} value={symbol}>{symbol}</option>)}
        </select>
      </div>
      <button onClick={runBacktest}>Run Backtest</button>
      {backtestResult && <p>{backtestResult}</p>}
    </div>
  );
};

export default Backtest;
