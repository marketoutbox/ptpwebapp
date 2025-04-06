import { useState, useEffect } from 'react';
import { openDB } from 'idb';
import calculateZScore from '../utils/calculations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaChartLine, FaExchangeAlt, FaCog, FaInfoCircle, FaDownload } from 'react-icons/fa';

// Disable SSR for this component
const Backtest = dynamic(() => import('../components/Backtest'), {
  ssr: false,
  loading: () => <p>Loading...</p>
});

export default function BacktestPage() {
  return <Backtest />;
}

const Backtest = () => {
  // ... [keep all existing state declarations] ...

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-700 text-white p-4 shadow-md">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <FaChartLine className="text-2xl" />
            <h1 className="text-2xl font-bold">PairTrading Pro</h1>
          </div>
          <nav className="flex space-x-6">
            <button className="hover:text-indigo-200 flex items-center">
              <FaExchangeAlt className="mr-2" /> Strategies
            </button>
            <button className="hover:text-indigo-200 flex items-center">
              <FaCog className="mr-2" /> Settings
            </button>
            <button className="hover:text-indigo-200 flex items-center">
              <FaInfoCircle className="mr-2" /> Docs
            </button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto p-4">
        {/* Control Panel */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
            <FaCog className="mr-2 text-indigo-600" /> Backtest Parameters
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Date Range</label>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={fromDate}
                  onChange={e => setFromDate(e.target.value)}
                />
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={toDate}
                  onChange={e => setToDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Stock A</label>
              <select
                name="stockA"
                onChange={handleSelection}
                value={selectedPair.stockA}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Select --</option>
                {stocks.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Stock B</label>
              <select
                name="stockB"
                onChange={handleSelection}
                value={selectedPair.stockB}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">-- Select --</option>
                {stocks.map(symbol => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Lookback (days)</label>
              <input
                type="number"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                value={lookbackPeriod}
                onChange={e => setLookbackPeriod(parseInt(e.target.value))}
                min="10"
                max="252"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Entry Z-score</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 pl-8 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={entryZ}
                  onChange={e => setEntryZ(parseFloat(e.target.value))}
                />
                <span className="absolute left-2 top-2.5 text-gray-500">±</span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Exit Z-score</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  className="w-full p-2 pl-8 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  value={exitZ}
                  onChange={e => setExitZ(parseFloat(e.target.value))}
                />
                <span className="absolute left-2 top-2.5 text-gray-500">±</span>
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={runBacktest}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-md transition duration-150"
              >
                Run Backtest
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {backtestData.length > 0 && (
          <div className="space-y-6">
            {/* Performance Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-green-500">
                <h3 className="text-sm font-medium text-gray-500">Total Trades</h3>
                <p className="text-2xl font-bold">{tradeResults.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-blue-500">
                <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
                <p className="text-2xl font-bold">
                  {tradeResults.length > 0 
                    ? `${Math.round(tradeResults.filter(t => parseFloat(t.profit) > 0).length / tradeResults.length * 100)}%` 
                    : '0%'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-purple-500">
                <h3 className="text-sm font-medium text-gray-500">Avg Profit</h3>
                <p className="text-2xl font-bold">
                  {tradeResults.length > 0 
                    ? `$${(
                        tradeResults.reduce((sum, trade) => sum + parseFloat(trade.profit), 0) / tradeResults.length
                      ).toFixed(2)}` 
                    : '$0.00'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md border-l-4 border-red-500">
                <h3 className="text-sm font-medium text-gray-500">Max Drawdown</h3>
                <p className="text-2xl font-bold">
                  {tradeResults.length > 0 
                    ? `-$${Math.max(...tradeResults.map(t => parseFloat(t.maxDrawdown))).toFixed(2)}` 
                    : '$0.00'}
                </p>
              </div>
            </div>

            {/* Spread Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Spread Evolution</h2>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={backtestData}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="spread" 
                      stroke="#6366F1" 
                      strokeWidth={2} 
                      dot={false}
                      name="Spread (A - βB)" 
                    />
                    <Line 
                      type="monotone" 
                      dataKey="zScore" 
                      stroke="#10B981" 
                      strokeWidth={2} 
                      dot={false}
                      name="Z-Score" 
                      yAxisId="right" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Trade Results Table */}
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-800">Trade Results</h2>
                <button className="text-indigo-600 hover:text-indigo-800 flex items-center">
                  <FaDownload className="mr-2" /> Export
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Days</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Drawdown</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">β Change</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tradeResults.map((trade, index) => (
                      <tr key={index} className={parseFloat(trade.profit) > 0 ? 'bg-green-50' : 'bg-red-50'}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{trade.entryDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trade.exitDate}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            trade.type === 'LONG' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {trade.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trade.holdingPeriod}</td>
                        <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                          parseFloat(trade.profit) > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          ${trade.profit}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">-${trade.maxDrawdown}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{trade.hedgeRatioChange}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-gray-800 text-white p-4 mt-8">
        <div className="container mx-auto text-center text-sm">
          <p>PairTrading Pro © {new Date().getFullYear()} - Advanced statistical arbitrage backtesting</p>
        </div>
      </footer>
    </div>
  );
};

export default Backtest;
