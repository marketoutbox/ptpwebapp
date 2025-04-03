import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import Chart from 'chart.js/auto';

const Backtest = () => {
  const [symbols, setSymbols] = useState([]);
  const [stockA, setStockA] = useState('');
  const [stockB, setStockB] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const loadSymbols = async () => {
      const db = await openDB('StockDB', 1);
      const store = db.transaction('stocks').objectStore('stocks');
      const keys = await store.getAllKeys();
      setSymbols(keys);
    };
    loadSymbols();
  }, []);

  const fetchStockData = async (symbol) => {
    const db = await openDB('StockDB', 1);
    return db.get('stocks', symbol);
  };

  const calculateZScore = (ratios, windowSize = 50) => {
    if (ratios.length < windowSize) return [];
    let meanArr = [], stdArr = [], zScores = [];
    for (let i = windowSize; i < ratios.length; i++) {
      const window = ratios.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const stdDev = Math.sqrt(window.reduce((sum, val) => sum + (val - mean) ** 2, 0) / window.length);
      meanArr.push(mean);
      stdArr.push(stdDev);
      zScores.push((ratios[i] - mean) / stdDev);
    }
    return zScores;
  };

  const runBacktest = async () => {
    if (!stockA || !stockB) return alert('Please select two stocks');

    const dataA = await fetchStockData(stockA);
    const dataB = await fetchStockData(stockB);
    if (!dataA || !dataB) return alert('Stock data not found in IndexedDB');

    const pricesA = dataA.chart.result[0].indicators.quote[0].close;
    const pricesB = dataB.chart.result[0].indicators.quote[0].close;
    const dates = dataA.chart.result[0].timestamp;
    const ratios = pricesA.map((p, i) => p / pricesB[i]);
    const zScores = calculateZScore(ratios);
    
    let trades = [];
    let openTrade = null;
    
    for (let i = 50; i < zScores.length; i++) {
      let date = new Date(dates[i] * 1000).toISOString().split('T')[0];
      
      if (!openTrade && zScores[i] > 2.5) {
        openTrade = { type: 'Sell', entryDate: date, entryRatio: ratios[i], entryZ: zScores[i] };
      } else if (!openTrade && zScores[i] < -2.5) {
        openTrade = { type: 'Buy', entryDate: date, entryRatio: ratios[i], entryZ: zScores[i] };
      } else if (openTrade && ((openTrade.type === 'Sell' && zScores[i] < 1.5) || (openTrade.type === 'Buy' && zScores[i] > -1.5))) {
        openTrade.exitDate = date;
        openTrade.exitRatio = ratios[i];
        openTrade.exitZ = zScores[i];
        trades.push(openTrade);
        openTrade = null;
      }
    }
    setResults(trades);
  };

  return (
    <div>
      <h1>Pair Trading Backtest</h1>
      <label>Stock A: </label>
      <select onChange={(e) => setStockA(e.target.value)}>
        <option value="">Select Stock</option>
        {symbols.map((symbol) => (
          <option key={symbol} value={symbol}>{symbol}</option>
        ))}
      </select>
      <label>Stock B: </label>
      <select onChange={(e) => setStockB(e.target.value)}>
        <option value="">Select Stock</option>
        {symbols.map((symbol) => (
          <option key={symbol} value={symbol}>{symbol}</option>
        ))}
      </select>
      <button onClick={runBacktest}>Run Backtest</button>
      <h2>Results</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Type</th>
            <th>Entry Date</th>
            <th>Entry Ratio</th>
            <th>Entry Z-score</th>
            <th>Exit Date</th>
            <th>Exit Ratio</th>
            <th>Exit Z-score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((trade, index) => (
            <tr key={index}>
              <td>{trade.type}</td>
              <td>{trade.entryDate}</td>
              <td>{trade.entryRatio.toFixed(4)}</td>
              <td>{trade.entryZ.toFixed(2)}</td>
              <td>{trade.exitDate}</td>
              <td>{trade.exitRatio.toFixed(4)}</td>
              <td>{trade.exitZ.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Backtest;
import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import Chart from 'chart.js/auto';

const Backtest = () => {
  const [symbols, setSymbols] = useState([]);
  const [stockA, setStockA] = useState('');
  const [stockB, setStockB] = useState('');
  const [results, setResults] = useState([]);

  useEffect(() => {
    const loadSymbols = async () => {
      const db = await openDB('StockDB', 1);
      const store = db.transaction('stocks').objectStore('stocks');
      const keys = await store.getAllKeys();
      setSymbols(keys);
    };
    loadSymbols();
  }, []);

  const fetchStockData = async (symbol) => {
    const db = await openDB('StockDB', 1);
    return db.get('stocks', symbol);
  };

  const calculateZScore = (ratios, windowSize = 50) => {
    if (ratios.length < windowSize) return [];
    let meanArr = [], stdArr = [], zScores = [];
    for (let i = windowSize; i < ratios.length; i++) {
      const window = ratios.slice(i - windowSize, i);
      const mean = window.reduce((sum, val) => sum + val, 0) / window.length;
      const stdDev = Math.sqrt(window.reduce((sum, val) => sum + (val - mean) ** 2, 0) / window.length);
      meanArr.push(mean);
      stdArr.push(stdDev);
      zScores.push((ratios[i] - mean) / stdDev);
    }
    return zScores;
  };

  const runBacktest = async () => {
    if (!stockA || !stockB) return alert('Please select two stocks');

    const dataA = await fetchStockData(stockA);
    const dataB = await fetchStockData(stockB);
    if (!dataA || !dataB) return alert('Stock data not found in IndexedDB');

    const pricesA = dataA.chart.result[0].indicators.quote[0].close;
    const pricesB = dataB.chart.result[0].indicators.quote[0].close;
    const dates = dataA.chart.result[0].timestamp;
    const ratios = pricesA.map((p, i) => p / pricesB[i]);
    const zScores = calculateZScore(ratios);
    
    let trades = [];
    let openTrade = null;
    
    for (let i = 50; i < zScores.length; i++) {
      let date = new Date(dates[i] * 1000).toISOString().split('T')[0];
      
      if (!openTrade && zScores[i] > 2.5) {
        openTrade = { type: 'Sell', entryDate: date, entryRatio: ratios[i], entryZ: zScores[i] };
      } else if (!openTrade && zScores[i] < -2.5) {
        openTrade = { type: 'Buy', entryDate: date, entryRatio: ratios[i], entryZ: zScores[i] };
      } else if (openTrade && ((openTrade.type === 'Sell' && zScores[i] < 1.5) || (openTrade.type === 'Buy' && zScores[i] > -1.5))) {
        openTrade.exitDate = date;
        openTrade.exitRatio = ratios[i];
        openTrade.exitZ = zScores[i];
        trades.push(openTrade);
        openTrade = null;
      }
    }
    setResults(trades);
  };

  return (
    <div>
      <h1>Pair Trading Backtest</h1>
      <label>Stock A: </label>
      <select onChange={(e) => setStockA(e.target.value)}>
        <option value="">Select Stock</option>
        {symbols.map((symbol) => (
          <option key={symbol} value={symbol}>{symbol}</option>
        ))}
      </select>
      <label>Stock B: </label>
      <select onChange={(e) => setStockB(e.target.value)}>
        <option value="">Select Stock</option>
        {symbols.map((symbol) => (
          <option key={symbol} value={symbol}>{symbol}</option>
        ))}
      </select>
      <button onClick={runBacktest}>Run Backtest</button>
      <h2>Results</h2>
      <table border="1">
        <thead>
          <tr>
            <th>Type</th>
            <th>Entry Date</th>
            <th>Entry Ratio</th>
            <th>Entry Z-score</th>
            <th>Exit Date</th>
            <th>Exit Ratio</th>
            <th>Exit Z-score</th>
          </tr>
        </thead>
        <tbody>
          {results.map((trade, index) => (
            <tr key={index}>
              <td>{trade.type}</td>
              <td>{trade.entryDate}</td>
              <td>{trade.entryRatio.toFixed(4)}</td>
              <td>{trade.entryZ.toFixed(2)}</td>
              <td>{trade.exitDate}</td>
              <td>{trade.exitRatio.toFixed(4)}</td>
              <td>{trade.exitZ.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Backtest;
