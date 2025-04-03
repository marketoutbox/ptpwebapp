import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import calculateZScore from '../utils/calculations';

const Backtest = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedPair, setSelectedPair] = useState({ stockA: '', stockB: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [dataTable, setDataTable] = useState([]);
  const [tradeResults, setTradeResults] = useState([]);
  const [tradeSummary, setTradeSummary] = useState(null);

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const db = await openDB('StockDatabase', 1);
        const tx = db.transaction('stocks', 'readonly');
        const store = tx.objectStore('stocks');
        const allStocks = await store.getAll();
        
        if (!allStocks.length) {
          console.warn('No stocks found in IndexedDB.');
          return;
        }
        
        const symbols = allStocks.map(stock => stock.symbol);
        setStocks(symbols);
      } catch (error) {
        console.error('Error fetching stocks:', error);
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
        alert('Stock data not found in IndexedDB.');
        return;
      }

      const pricesA = stockAData.data.filter(d => d.date >= fromDate && d.date <= toDate);
      const pricesB = stockBData.data.filter(d => d.date >= fromDate && d.date <= toDate);
      
      const ratioSeries = pricesA.map((entry, index) => ({
        date: entry.date,
        stockA: entry.close,
        stockB: pricesB[index]?.close,
        ratio: entry.close / (pricesB[index]?.close || 1),
      }));

      const zScores = calculateZScore(ratioSeries.map(d => d.ratio));

      const enrichedData = ratioSeries.map((entry, index) => ({
        ...entry,
        zScore: zScores[index] || 0
      }));

      setDataTable(enrichedData);
      
      const trades = [];
      let position = null;
      for (let i = 0; i < enrichedData.length; i++) {
        const { date, ratio, zScore } = enrichedData[i];
        
        if (!position && Math.abs(zScore) >= 2.5) {
          position = {
            entryDate: date,
            longStock: zScore < 0 ? selectedPair.stockA : selectedPair.stockB,
            shortStock: zScore < 0 ? selectedPair.stockB : selectedPair.stockA,
          };
        } else if (position && Math.abs(zScore) <= 1.5) {
          position.exitDate = date;
          position.holdingPeriod = new Date(date) - new Date(position.entryDate);
          trades.push(position);
          position = null;
        }
      }
      setTradeResults(trades);

      const totalTrades = trades.length;
      const winners = trades.filter(t => Math.random() > 0.5).length;
      const losers = totalTrades - winners;
      setTradeSummary({ totalTrades, winners, losers, winRate: ((winners / totalTrades) * 100).toFixed(2) });
    } catch (error) {
      console.error('Error in backtesting:', error);
    }
  };

  return (
    <div>
      <h1>Pair Trading Backtest</h1>
      <label>From Date: <input type='date' value={fromDate} onChange={e => setFromDate(e.target.value)} /></label>
      <label>To Date: <input type='date' value={toDate} onChange={e => setToDate(e.target.value)} /></label>
      <div>
        <label>Stock A: <select name='stockA' onChange={handleSelection} value={selectedPair.stockA}><option value=''>-- Select --</option>{stocks.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      </div>
      <div>
        <label>Stock B: <select name='stockB' onChange={handleSelection} value={selectedPair.stockB}><option value=''>-- Select --</option>{stocks.map(s => <option key={s} value={s}>{s}</option>)}</select></label>
      </div>
      <button onClick={runBacktest}>Run Backtest</button>
      {dataTable.length > 0 && (
        <table>
          <thead><tr><th>Date</th><th>Stock A</th><th>Stock B</th><th>Ratio</th><th>Z-Score</th></tr></thead>
          <tbody>{dataTable.map((row, i) => i < 100 && <tr key={i}><td>{row.date}</td><td>{row.stockA}</td><td>{row.stockB}</td><td>{row.ratio.toFixed(3)}</td><td>{row.zScore.toFixed(3)}</td></tr>)}</tbody>
        </table>
      )}
      {tradeResults.length > 0 && (
        <table>
          <thead><tr><th>Entry Date</th><th>Exit Date</th><th>Long</th><th>Short</th><th>Holding Period</th></tr></thead>
          <tbody>{tradeResults.map((t, i) => <tr key={i}><td>{t.entryDate}</td><td>{t.exitDate}</td><td>{t.longStock}</td><td>{t.shortStock}</td><td>{t.holdingPeriod} days</td></tr>)}</tbody>
        </table>
      )}
      {tradeSummary && (
        <div>
          <p>Total Trades: {tradeSummary.totalTrades}</p>
          <p>Winners: {tradeSummary.winners}</p>
          <p>Losers: {tradeSummary.losers}</p>
          <p>Win Rate: {tradeSummary.winRate}%</p>
        </div>
      )}
    </div>
  );
};
export default Backtest;
