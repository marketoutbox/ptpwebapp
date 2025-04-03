import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import Chart from 'chart.js/auto';

const Backtest = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedPair, setSelectedPair] = useState({ stockA: '', stockB: '' });
  const [backtestResult, setBacktestResult] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      const db = await openDB('StockDB', 1);
      const tx = db.transaction('stocks', 'readonly');
      const store = tx.objectStore('stocks');
      const allStocks = await store.getAll();
      setStocks(allStocks.map(stock => stock.symbol));
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
    
    // Dummy backtest logic (replace with actual logic later)
    setBacktestResult(`Backtest results for ${selectedPair.stockA} and ${selectedPair.stockB}`);
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
