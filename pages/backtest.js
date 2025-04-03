import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import Chart from 'chart.js/auto';

const Backtest = () => {
  const [pairs, setPairs] = useState([]);
  const [selectedPair, setSelectedPair] = useState('');
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchPairsFromDB = async () => {
      const db = await openDB('StockDB', 1);
      const tx = db.transaction('stocks', 'readonly');
      const store = tx.objectStore('stocks');
      const allStocks = await store.getAll();
      setPairs(allStocks.map(stock => stock.symbol));
    };
    fetchPairsFromDB();
  }, []);

  const runBacktest = async () => {
    if (!selectedPair) {
      alert("Please select a pair to backtest.");
      return;
    }
    
    // Dummy backtest logic (Replace with actual calculation)
    const backtestResult = {
      labels: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5'],
      data: [100, 105, 102, 108, 110]
    };
    
    setChartData(backtestResult);
  };

  useEffect(() => {
    if (chartData) {
      const ctx = document.getElementById('backtestChart').getContext('2d');
      new Chart(ctx, {
        type: 'line',
        data: {
          labels: chartData.labels,
          datasets: [{
            label: 'Backtest Results',
            data: chartData.data,
            borderColor: 'blue',
            fill: false
          }]
        }
      });
    }
  }, [chartData]);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pair Trading Backtest</h1>

      <select 
        value={selectedPair} 
        onChange={(e) => setSelectedPair(e.target.value)} 
        className="border p-2 mb-4"
      >
        <option value="">Select a Pair</option>
        {pairs.map(pair => (
          <option key={pair} value={pair}>{pair}</option>
        ))}
      </select>

      <button 
        onClick={runBacktest} 
        className="bg-blue-500 text-white px-4 py-2 rounded"
      >
        Run Backtest
      </button>

      {chartData && (
        <canvas id="backtestChart" width="400" height="200"></canvas>
      )}
    </div>
  );
};

export default Backtest;
