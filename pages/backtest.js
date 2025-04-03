import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import { calculateZScore } from '../utils/calculations';

const Backtest = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedPair, setSelectedPair] = useState({ stockA: '', stockB: '' });
  const [trades, setTrades] = useState([]);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const db = await openDB('StockDatabase', 1);
        const tx = db.transaction('stocks', 'readonly');
        const store = tx.objectStore('stocks');
        const allStocks = await store.getAll();
        if (!allStocks.length) return;
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
      alert('Please select two stocks.');
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

      const pricesA = stockAData.data.map(entry => entry.close);
      const pricesB = stockBData.data.map(entry => entry.close);
      
      // Calculate Ratios
      const ratios = pricesA.map((a, i) => a / (pricesB[i] || 1));
      const zScores = calculateZScore(ratios);

      window.ratios = ratios; // Debugging
      window.zScores = zScores;

      let currentPosition = null;
      let tradeHistory = [];
      let entryPriceA = 0, entryPriceB = 0;

      zScores.forEach((z, i) => {
        if (z > 2.5 && !currentPosition) {
          // Short Ratio (Sell A, Buy B)
          currentPosition = 'SHORT';
          entryPriceA = pricesA[i];
          entryPriceB = pricesB[i];
          tradeHistory.push({ date: stockAData.data[i].date, type: 'Short', entryA: entryPriceA, entryB: entryPriceB });
        } else if (z < -2.5 && !currentPosition) {
          // Long Ratio (Buy A, Sell B)
          currentPosition = 'LONG';
          entryPriceA = pricesA[i];
          entryPriceB = pricesB[i];
          tradeHistory.push({ date: stockAData.data[i].date, type: 'Long', entryA: entryPriceA, entryB: entryPriceB });
        } else if (currentPosition === 'SHORT' && z < 1.5) {
          // Exit Short
          tradeHistory[tradeHistory.length - 1].exitA = pricesA[i];
          tradeHistory[tradeHistory.length - 1].exitB = pricesB[i];
          tradeHistory[tradeHistory.length - 1].exitDate = stockAData.data[i].date;
          currentPosition = null;
        } else if (currentPosition === 'LONG' && z > -1.5) {
          // Exit Long
          tradeHistory[tradeHistory.length - 1].exitA = pricesA[i];
          tradeHistory[tradeHistory.length - 1].exitB = pricesB[i];
          tradeHistory[tradeHistory.length - 1].exitDate = stockAData.data[i].date;
          currentPosition = null;
        }
      });

      setTrades(tradeHistory);
    } catch (error) {
      console.error("Error running backtest:", error);
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
      {trades.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Trade Type</th>
              <th>Entry A</th>
              <th>Entry B</th>
              <th>Exit A</th>
              <th>Exit B</th>
              <th>Exit Date</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr key={index}>
                <td>{trade.date}</td>
                <td>{trade.type}</td>
                <td>{trade.entryA}</td>
                <td>{trade.entryB}</td>
                <td>{trade.exitA || '-'}</td>
                <td>{trade.exitB || '-'}</td>
                <td>{trade.exitDate || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Backtest;
