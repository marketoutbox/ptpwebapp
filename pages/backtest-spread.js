"use client"

import { useState, useEffect } from "react"
import { openDB } from "idb"
import calculateZScore from "../utils/calculations"
import { Card } from "@/components/ui/card"

const Backtest = () => {
  const [stocks, setStocks] = useState([])
  const [selectedPair, setSelectedPair] = useState({ stockA: "", stockB: "" })
  const [fromDate, setFromDate] = useState("")
  const [toDate, setToDate] = useState("")
  const [entryZ, setEntryZ] = useState(2.5)
  const [exitZ, setExitZ] = useState(1.5)
  const [backtestData, setBacktestData] = useState([])
  const [tradeResults, setTradeResults] = useState([])
  const [lookbackPeriod, setLookbackPeriod] = useState(50) // For hedge ratio calculation

  useEffect(() => {
    const fetchStocks = async () => {
      try {
        const db = await openDB("StockDatabase", 1)
        const tx = db.transaction("stocks", "readonly")
        const store = tx.objectStore("stocks")
        const allStocks = await store.getAll()
        if (!allStocks.length) return
        setStocks(allStocks.map((stock) => stock.symbol))
      } catch (error) {
        console.error("Error fetching stocks:", error)
      }
    }
    fetchStocks()
  }, [])

  const handleSelection = (event) => {
    const { name, value } = event.target
    setSelectedPair((prev) => ({ ...prev, [name]: value }))
  }

  const filterByDate = (data) => {
    return data.filter((entry) => entry.date >= fromDate && entry.date <= toDate)
  }

  const calculateHedgeRatio = (pricesA, pricesB, currentIndex, windowSize) => {
    const startIdx = Math.max(0, currentIndex - windowSize + 1)
    const endIdx = currentIndex + 1

    let sumA = 0,
      sumB = 0,
      sumAB = 0,
      sumB2 = 0
    let count = 0

    for (let i = startIdx; i < endIdx; i++) {
      sumA += pricesA[i].close
      sumB += pricesB[i].close
      sumAB += pricesA[i].close * pricesB[i].close
      sumB2 += pricesB[i].close * pricesB[i].close
      count++
    }

    // Avoid division by zero
    if (count === 0 || count * sumB2 - sumB * sumB === 0) return 1

    return (count * sumAB - sumA * sumB) / (count * sumB2 - sumB * sumB)
  }

  const runBacktest = async () => {
    if (!selectedPair.stockA || !selectedPair.stockB) {
      alert("Please select two stocks.")
      return
    }

    try {
      const db = await openDB("StockDatabase", 1)
      const tx = db.transaction("stocks", "readonly")
      const store = tx.objectStore("stocks")
      const stockAData = await store.get(selectedPair.stockA)
      const stockBData = await store.get(selectedPair.stockB)
      if (!stockAData || !stockBData) {
        alert("Stock data not found.")
        return
      }

      const pricesA = filterByDate(stockAData.data)
      const pricesB = filterByDate(stockBData.data)
      const minLength = Math.min(pricesA.length, pricesB.length)

      const spreads = []
      const hedgeRatios = []

      // Calculate rolling hedge ratios and spreads
      for (let i = 0; i < minLength; i++) {
        // Use same lookback period for both hedge ratio and z-score for consistency
        const currentHedgeRatio = calculateHedgeRatio(pricesA, pricesB, i, lookbackPeriod)
        hedgeRatios.push(currentHedgeRatio)

        spreads.push({
          date: pricesA[i].date,
          spread: pricesA[i].close - currentHedgeRatio * pricesB[i].close,
          stockAClose: pricesA[i].close,
          stockBClose: pricesB[i].close,
          hedgeRatio: currentHedgeRatio,
        })
      }

      // Calculate z-scores for spreads
      const zScores = []
      for (let i = 0; i < spreads.length; i++) {
        const windowData = spreads.slice(Math.max(0, i - lookbackPeriod + 1), i + 1).map((s) => s.spread)
        zScores.push(calculateZScore(windowData).pop())
      }

      const tableData = spreads.map((item, index) => ({
        date: item.date,
        stockAClose: item.stockAClose,
        stockBClose: item.stockBClose,
        spread: item.spread,
        zScore: zScores[index] || 0,
        hedgeRatio: item.hedgeRatio,
      }))
      setBacktestData(tableData)

      const trades = []
      let openTrade = null

      for (let i = 1; i < tableData.length; i++) {
        const prevZ = tableData[i - 1].zScore
        const currZ = tableData[i].zScore
        const { date, spread, hedgeRatio } = tableData[i]

        if (!openTrade) {
          if (prevZ > -entryZ && currZ <= -entryZ) {
            openTrade = {
              entryDate: date,
              type: "LONG",
              entryIndex: i,
              entrySpread: spread,
              entryHedgeRatio: hedgeRatio,
            }
          } else if (prevZ < entryZ && currZ >= entryZ) {
            openTrade = {
              entryDate: date,
              type: "SHORT",
              entryIndex: i,
              entrySpread: spread,
              entryHedgeRatio: hedgeRatio,
            }
          }
        } else {
          const holdingPeriod = (new Date(date) - new Date(openTrade.entryDate)) / (1000 * 60 * 60 * 24)
          const exitCondition =
            (openTrade.type === "LONG" && prevZ < -exitZ && currZ >= -exitZ) ||
            (openTrade.type === "SHORT" && prevZ > exitZ && currZ <= exitZ) ||
            holdingPeriod >= 15

          if (exitCondition) {
            const exitIndex = i
            const exitSpread = spread
            const currentHedgeRatio = hedgeRatio

            const tradeSlice = tableData.slice(openTrade.entryIndex, exitIndex + 1)
            const spreadSeries = tradeSlice.map((s) => s.spread)
            const drawdowns = spreadSeries.map((s) => {
              if (openTrade.type === "LONG") return s - openTrade.entrySpread
              else return openTrade.entrySpread - s
            })
            const maxDrawdown = Math.max(...drawdowns.map((d) => -d))

            // Calculate profit using entry hedge ratio for consistency
            const profit =
              openTrade.type === "LONG" ? exitSpread - openTrade.entrySpread : openTrade.entrySpread - exitSpread

            trades.push({
              entryDate: openTrade.entryDate,
              exitDate: date,
              type: openTrade.type,
              holdingPeriod: holdingPeriod.toFixed(0),
              profit: profit.toFixed(2),
              maxDrawdown: maxDrawdown.toFixed(2),
              hedgeRatio: openTrade.entryHedgeRatio.toFixed(4),
              exitHedgeRatio: currentHedgeRatio.toFixed(4),
              hedgeRatioChange: (
                ((currentHedgeRatio - openTrade.entryHedgeRatio) / openTrade.entryHedgeRatio) *
                100
              ).toFixed(2),
            })

            openTrade = null
          }
        }
      }

      setTradeResults(trades)
    } catch (error) {
      console.error("Error in backtest:", error)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 to-blue-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-yellow-400">Pair Trading Backtest</h1>

        <Card className="bg-blue-800/50 border-blue-700 rounded-xl p-6 mb-6 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm text-blue-200 mb-1">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-blue-200 mb-1">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col">
                <label className="text-sm text-blue-200 mb-1">Stock A</label>
                <select
                  name="stockA"
                  onChange={handleSelection}
                  value={selectedPair.stockA}
                  className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
                >
                  <option value="">-- Select --</option>
                  {stocks.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col">
                <label className="text-sm text-blue-200 mb-1">Stock B</label>
                <select
                  name="stockB"
                  onChange={handleSelection}
                  value={selectedPair.stockB}
                  className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
                >
                  <option value="">-- Select --</option>
                  {stocks.map((symbol) => (
                    <option key={symbol} value={symbol}>
                      {symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="flex flex-col">
              <label className="text-sm text-blue-200 mb-1">Lookback Period (days)</label>
              <input
                type="number"
                value={lookbackPeriod}
                onChange={(e) => setLookbackPeriod(Number.parseInt(e.target.value))}
                min="10"
                max="252"
                className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-blue-200 mb-1">Entry Z-score</label>
              <input
                type="number"
                step="0.1"
                value={entryZ}
                onChange={(e) => setEntryZ(Number.parseFloat(e.target.value))}
                className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="flex flex-col">
              <label className="text-sm text-blue-200 mb-1">Exit Z-score</label>
              <input
                type="number"
                step="0.1"
                value={exitZ}
                onChange={(e) => setExitZ(Number.parseFloat(e.target.value))}
                className="bg-blue-900/80 border border-blue-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div className="mt-6">
            <button
              onClick={runBacktest}
              className="bg-yellow-400 hover:bg-yellow-500 text-blue-900 font-bold py-2 px-6 rounded-lg transition-colors"
            >
              Run Backtest
            </button>
          </div>
        </Card>

        {backtestData.length > 0 && (
          <Card className="bg-blue-800/50 border-blue-700 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">Backtest Data</h2>
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-blue-700">
              <table className="w-full">
                <thead className="bg-blue-900/80 sticky top-0">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-blue-200">Date</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Stock A Close</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Stock B Close</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Hedge Ratio (β)</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Spread (A - βB)</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Z-score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-700/50">
                  {backtestData.map((row, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-blue-900/30" : "bg-blue-900/10"}>
                      <td className="p-3 text-left">{row.date}</td>
                      <td className="p-3 text-right">{row.stockAClose.toFixed(2)}</td>
                      <td className="p-3 text-right">{row.stockBClose.toFixed(2)}</td>
                      <td className="p-3 text-right">{row.hedgeRatio.toFixed(4)}</td>
                      <td className="p-3 text-right">{row.spread.toFixed(4)}</td>
                      <td className="p-3 text-right">{row.zScore.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {tradeResults.length > 0 && (
          <Card className="bg-blue-800/50 border-blue-700 rounded-xl p-6 mb-6 backdrop-blur-sm">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">Trade Results</h2>
            <div className="overflow-x-auto rounded-lg border border-blue-700">
              <table className="w-full">
                <thead className="bg-blue-900/80">
                  <tr>
                    <th className="p-3 text-left text-sm font-semibold text-blue-200">Entry Date</th>
                    <th className="p-3 text-left text-sm font-semibold text-blue-200">Exit Date</th>
                    <th className="p-3 text-center text-sm font-semibold text-blue-200">Type</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Days</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Profit ($)</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Drawdown ($)</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Entry β</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">Exit β</th>
                    <th className="p-3 text-right text-sm font-semibold text-blue-200">β Change (%)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-700/50">
                  {tradeResults.map((trade, index) => (
                    <tr key={index} className={index % 2 === 0 ? "bg-blue-900/30" : "bg-blue-900/10"}>
                      <td className="p-3 text-left">{trade.entryDate}</td>
                      <td className="p-3 text-left">{trade.exitDate}</td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                            trade.type === "LONG" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {trade.type}
                        </span>
                      </td>
                      <td className="p-3 text-right">{trade.holdingPeriod}</td>
                      <td
                        className={`p-3 text-right font-medium ${
                          Number.parseFloat(trade.profit) >= 0 ? "text-yellow-400" : "text-red-400"
                        }`}
                      >
                        ${trade.profit}
                      </td>
                      <td className="p-3 text-right text-red-400">${trade.maxDrawdown}</td>
                      <td className="p-3 text-right">{trade.hedgeRatio}</td>
                      <td className="p-3 text-right">{trade.exitHedgeRatio}</td>
                      <td
                        className={`p-3 text-right ${
                          Number.parseFloat(trade.hedgeRatioChange) >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {trade.hedgeRatioChange}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default Backtest
