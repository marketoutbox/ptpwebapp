"use client";
import { useEffect, useState } from "react";
import { getStockDataFromIndexedDB } from "@/utils/indexedDbUtils";
import { calculateZScore } from "@/utils/calculations";

export default function BacktestPage({ params }) {
  const [stockData, setStockData] = useState({});
  const [trades, setTrades] = useState([]);
  const [entryLongZ, setEntryLongZ] = useState(-2.5);
  const [entryShortZ, setEntryShortZ] = useState(2.5);
  const [exitLongZ, setExitLongZ] = useState(-1.5);
  const [exitShortZ, setExitShortZ] = useState(1.5);
  const [backtestTrigger, setBacktestTrigger] = useState(false);

  const runBacktest = async () => {
    const [stockA, stockB] = params.pair.split("-");
    const dataA = await getStockDataFromIndexedDB(stockA);
    const dataB = await getStockDataFromIndexedDB(stockB);

    if (!dataA.length || !dataB.length) return;

    const pricesA = dataA.map(d => d.close);
    const pricesB = dataB.map(d => d.close);
    const dates = dataA.map(d => d.date);

    const ratio = pricesA.map((price, i) => price / pricesB[i]);
    const zScores = calculateZScore(ratio, 50);

    const tradeResults = [];
    let openTrade = null;

    for (let i = 1; i < zScores.length; i++) {
      const prevZ = zScores[i - 1];
      const currZ = zScores[i];
      const date = dates[i];

      if (!openTrade) {
        if (prevZ > entryLongZ && currZ <= entryLongZ) {
          openTrade = { entryDate: date, type: "LONG", exitDate: null };
        } else if (prevZ < entryShortZ && currZ >= entryShortZ) {
          openTrade = { entryDate: date, type: "SHORT", exitDate: null };
        }
      } else {
        const holdingPeriod =
          (new Date(date) - new Date(openTrade.entryDate)) / (1000 * 60 * 60 * 24);

        const shouldExit =
          (openTrade.type === "LONG" &&
            prevZ < exitLongZ &&
            currZ >= exitLongZ) ||
          (openTrade.type === "SHORT" &&
            prevZ > exitShortZ &&
            currZ <= exitShortZ) ||
          holdingPeriod >= 15;

        if (shouldExit) {
          openTrade.exitDate = date;
          tradeResults.push(openTrade);
          openTrade = null;
        }
      }
    }

    setTrades(tradeResults);
  };

  useEffect(() => {
    runBacktest();
  }, [backtestTrigger]);

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">
        Pair Trading Backtest: {params.pair}
      </h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block font-semibold">Entry Long Z (cross below)</label>
          <input
            type="number"
            step="0.1"
            value={entryLongZ}
            onChange={(e) => setEntryLongZ(parseFloat(e.target.value))}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Entry Short Z (cross above)</label>
          <input
            type="number"
            step="0.1"
            value={entryShortZ}
            onChange={(e) => setEntryShortZ(parseFloat(e.target.value))}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Exit Long Z (cross above)</label>
          <input
            type="number"
            step="0.1"
            value={exitLongZ}
            onChange={(e) => setExitLongZ(parseFloat(e.target.value))}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label className="block font-semibold">Exit Short Z (cross below)</label>
          <input
            type="number"
            step="0.1"
            value={exitShortZ}
            onChange={(e) => setExitShortZ(parseFloat(e.target.value))}
            className="border p-2 rounded w-full"
          />
        </div>
      </div>

      <button
        onClick={() => setBacktestTrigger(!backtestTrigger)}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        Run Backtest
      </button>

      <div className="mt-6">
        <h2 className="text-xl font-semibold mb-2">Trades</h2>
        <div className="overflow-auto max-h-[400px] border rounded">
          <table className="w-full text-sm table-auto border-collapse">
            <thead className="bg-gray-200 sticky top-0">
              <tr>
                <th className="border p-2">Type</th>
                <th className="border p-2">Entry Date</th>
                <th className="border p-2">Exit Date</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade, i) => (
                <tr key={i} className="odd:bg-white even:bg-gray-50">
                  <td className="border p-2 text-center">{trade.type}</td>
                  <td className="border p-2 text-center">{trade.entryDate}</td>
                  <td className="border p-2 text-center">{trade.exitDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
