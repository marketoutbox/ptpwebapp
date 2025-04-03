import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import calculateZScore from '../utils/calculations';

const Backtest = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedPair, setSelectedPair] = useState({ stockA: '', stockB: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [backtestData, setBacktestData] = useState([]);
  const [tradeResults, setTradeResults] = useState([]);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const db = await openDB('StockDatabase', 1);
        const tx = db.transaction('stocks', 'readonly');
        const store = tx.objectStore('stocks');
        const allStocks = await store.getAll();
        if (!allStocks.length) return;
        setStocks(allStocks.map(stock => stock.symbol));
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

  const filterByDate = (data) => {
    return data.filter(entry => entry.date >= fromDate && entry.date <= toDate);
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
        alert("Stock data not found.");
        return;
      }

      const pricesA = filterByDate(stockAData.data);
      const pricesB = filterByDate(stockBData.data);
      
      const minLength = Math.min(pricesA.length, pricesB.length);
      const ratios = [];
      for (let i = 0; i < minLength; i++) {
        ratios.push({
          date: pricesA[i].date,
          ratio: pricesA[i].close / pricesB[i].close,
          stockAClose: pricesA[i].close,
          stockBClose: pricesB[i].close,
        });
      }
      
      const zScores = calculateZScore(ratios.map(r => r.ratio));
      
      const tableData = ratios.map((item, index) => ({
        date: item.date,
        stockAClose: item.stockAClose,
        stockBClose: item.stockBClose,
        ratio: item.ratio,
        zScore: zScores[index] || 0,
      }));
      setBacktestData(tableData);

      // Trade Logic
      const trades = [];
      let openTrade = null;
      for (let i = 0; i < tableData.length; i++) {
        let { date, zScore } = tableData[i];

        if (!openTrade) {
          if (zScore <= -2.5) {
            openTrade = { entryDate: date, type: 'LONG', exitDate: null };
          } else if (zScore >= 2.5) {
            openTrade = { entryDate: date, type: 'SHORT', exitDate: null };
          }
        } else {
          const holdingPeriod = (new Date(date) - new Date(openTrade.entryDate)) / (1000 * 60 * 60 * 24);
          if ((openTrade.type === 'LONG' && zScore >= -1.5) ||
              (openTrade.type === 'SHORT' && zScore <= 1.5) ||
              holdingPeriod >= 30) {
            openTrade.exitDate = date;
            trades.push(openTrade);
            openTrade = null;
          }
        }
      }
      setTradeResults(trades);
    } catch (error) {
      console.error("Error in backtest:", error);
    }
  };

  return (
    <div>
      <h1>Pair Trading Backtest</h1>
      <div>
        <label>From: </label>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} />
        <label>To: </label>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} />
      </div>
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

      {/* Backtest Table */}
      {backtestData.length > 0 && (
        <div style={{ maxHeight: '300px', overflowY: 'scroll', marginTop: '20px' }}>
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Date</th>
                <th>Stock A Close</th>
                <th>Stock B Close</th>
                <th>Ratio</th>
                <th>Z-score</th>
              </tr>
            </thead>
            <tbody>
              {backtestData.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td>{row.stockAClose.toFixed(2)}</td>
                  <td>{row.stockBClose.toFixed(2)}</td>
                  <td>{row.ratio.toFixed(4)}</td>
                  <td>{row.zScore.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Backtest;
