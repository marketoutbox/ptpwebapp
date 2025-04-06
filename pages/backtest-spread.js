import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import calculateZScore from '../utils/calculations';

const Backtest = () => {
  const [stocks, setStocks] = useState([]);
  const [selectedPair, setSelectedPair] = useState({ stockA: '', stockB: '' });
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [entryZ, setEntryZ] = useState(2.5);
  const [exitZ, setExitZ] = useState(1.5);
  const [backtestData, setBacktestData] = useState([]);
  const [tradeResults, setTradeResults] = useState([]);
  const [lookbackPeriod, setLookbackPeriod] = useState(50); // For hedge ratio calculation

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

  const calculateHedgeRatio = (pricesA, pricesB, currentIndex, windowSize) => {
    const startIdx = Math.max(0, currentIndex - windowSize + 1);
    const endIdx = currentIndex + 1;
    
    let sumA = 0, sumB = 0, sumAB = 0, sumB2 = 0;
    let count = 0;
    
    for (let i = startIdx; i < endIdx; i++) {
      sumA += pricesA[i].close;
      sumB += pricesB[i].close;
      sumAB += pricesA[i].close * pricesB[i].close;
      sumB2 += pricesB[i].close * pricesB[i].close;
      count++;
    }
    
    // Avoid division by zero
    if (count === 0 || (count * sumB2 - sumB * sumB) === 0) return 1;
    
    return (count * sumAB - sumA * sumB) / (count * sumB2 - sumB * sumB);
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
      
      const spreads = [];
      const hedgeRatios = [];
      
      // Calculate rolling hedge ratios and spreads
      for (let i = 0; i < minLength; i++) {
        // Use same lookback period for both hedge ratio and z-score for consistency
        const currentHedgeRatio = calculateHedgeRatio(pricesA, pricesB, i, lookbackPeriod);
        hedgeRatios.push(currentHedgeRatio);
        
        spreads.push({
          date: pricesA[i].date,
          spread: pricesA[i].close - (currentHedgeRatio * pricesB[i].close),
          stockAClose: pricesA[i].close,
          stockBClose: pricesB[i].close,
          hedgeRatio: currentHedgeRatio
        });
      }

      // Calculate z-scores for spreads
      const zScores = [];
      for (let i = 0; i < spreads.length; i++) {
        const windowData = spreads.slice(Math.max(0, i - lookbackPeriod + 1), i + 1).map(s => s.spread);
        zScores.push(calculateZScore(windowData).pop());
      }

      const tableData = spreads.map((item, index) => ({
        date: item.date,
        stockAClose: item.stockAClose,
        stockBClose: item.stockBClose,
        spread: item.spread,
        zScore: zScores[index] || 0,
        hedgeRatio: item.hedgeRatio
      }));
      setBacktestData(tableData);

      const trades = [];
      let openTrade = null;

      for (let i = 1; i < tableData.length; i++) {
        const prevZ = tableData[i - 1].zScore;
        const currZ = tableData[i].zScore;
        const { date, spread, hedgeRatio } = tableData[i];

        if (!openTrade) {
          if (prevZ > -entryZ && currZ <= -entryZ) {
            openTrade = { 
              entryDate: date, 
              type: 'LONG', 
              entryIndex: i,
              entrySpread: spread,
              entryHedgeRatio: hedgeRatio
            };
          } else if (prevZ < entryZ && currZ >= entryZ) {
            openTrade = { 
              entryDate: date, 
              type: 'SHORT', 
              entryIndex: i,
              entrySpread: spread,
              entryHedgeRatio: hedgeRatio
            };
          }
        } else {
          const holdingPeriod = (new Date(date) - new Date(openTrade.entryDate)) / (1000 * 60 * 60 * 24);
          const exitCondition =
            (openTrade.type === 'LONG' && prevZ < -exitZ && currZ >= -exitZ) ||
            (openTrade.type === 'SHORT' && prevZ > exitZ && currZ <= exitZ) ||
            holdingPeriod >= 15;

          if (exitCondition) {
            const exitIndex = i;
            const exitSpread = spread;
            const currentHedgeRatio = hedgeRatio;

            const tradeSlice = tableData.slice(openTrade.entryIndex, exitIndex + 1);
            const spreadSeries = tradeSlice.map(s => s.spread);
            const drawdowns = spreadSeries.map(s => {
              if (openTrade.type === 'LONG') return (s - openTrade.entrySpread);
              else return (openTrade.entrySpread - s);
            });
            const maxDrawdown = Math.max(...drawdowns.map(d => -d));

            // Calculate profit using entry hedge ratio for consistency
            const profit = openTrade.type === 'LONG'
              ? (exitSpread - openTrade.entrySpread)
              : (openTrade.entrySpread - exitSpread);

            trades.push({
              entryDate: openTrade.entryDate,
              exitDate: date,
              type: openTrade.type,
              holdingPeriod: holdingPeriod.toFixed(0),
              profit: profit.toFixed(2),
              maxDrawdown: maxDrawdown.toFixed(2),
              hedgeRatio: openTrade.entryHedgeRatio.toFixed(4),
              exitHedgeRatio: currentHedgeRatio.toFixed(4),
              hedgeRatioChange: ((currentHedgeRatio - openTrade.entryHedgeRatio) / openTrade.entryHedgeRatio * 100).toFixed(2)
            });

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
      <h1>Pair Trading Backtest (Dynamic Spread Model)</h1>
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

      <div style={{ marginTop: '10px' }}>
        <label>Lookback Period (days): </label>
        <input 
          type="number" 
          value={lookbackPeriod} 
          onChange={e => setLookbackPeriod(parseInt(e.target.value))} 
          min="10"
          max="252"
        />
        <label style={{ marginLeft: '10px' }}>Entry Z-score: </label>
        <input type="number" step="0.1" value={entryZ} onChange={e => setEntryZ(parseFloat(e.target.value))} />
        <label style={{ marginLeft: '10px' }}>Exit Z-score: </label>
        <input type="number" step="0.1" value={exitZ} onChange={e => setExitZ(parseFloat(e.target.value))} />
      </div>

      <button onClick={runBacktest} style={{ marginTop: '10px' }}>Run Backtest</button>

      {backtestData.length > 0 && (
        <div style={{ maxHeight: '300px', overflowY: 'scroll', marginTop: '20px' }}>
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Date</th>
                <th>Stock A Close</th>
                <th>Stock B Close</th>
                <th>Hedge Ratio (β)</th>
                <th>Spread (A - βB)</th>
                <th>Z-score</th>
              </tr>
            </thead>
            <tbody>
              {backtestData.map((row, index) => (
                <tr key={index}>
                  <td>{row.date}</td>
                  <td>{row.stockAClose.toFixed(2)}</td>
                  <td>{row.stockBClose.toFixed(2)}</td>
                  <td>{row.hedgeRatio.toFixed(4)}</td>
                  <td>{row.spread.toFixed(4)}</td>
                  <td>{row.zScore.toFixed(4)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tradeResults.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h2>Trade Results</h2>
          <table border="1" width="100%">
            <thead>
              <tr>
                <th>Entry Date</th>
                <th>Exit Date</th>
                <th>Type</th>
                <th>Days</th>
                <th>Profit ($)</th>
                <th>Drawdown ($)</th>
                <th>Entry β</th>
                <th>Exit β</th>
                <th>β Change (%)</th>
              </tr>
            </thead>
            <tbody>
              {tradeResults.map((trade, index) => (
                <tr key={index}>
                  <td>{trade.entryDate}</td>
                  <td>{trade.exitDate}</td>
                  <td>{trade.type}</td>
                  <td>{trade.holdingPeriod}</td>
                  <td>${trade.profit}</td>
                  <td>${trade.maxDrawdown}</td>
                  <td>{trade.hedgeRatio}</td>
                  <td>{trade.exitHedgeRatio}</td>
                  <td>{trade.hedgeRatioChange}%</td>
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
