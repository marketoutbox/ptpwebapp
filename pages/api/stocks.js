export default async function handler(req, res) {
  let { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: "No symbols provided" });
  }

  // Convert "AAPL,MSFT,GOOG" -> ["AAPL", "MSFT", "GOOG"]
  const symbolList = symbols.split(",");

  try {
    const results = await Promise.all(
      symbolList.map(async (symbol) => {
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=1mo&interval=1d`
        );
        const data = await response.json();
        
        if (data.chart?.error) {
          return { symbol, error: data.chart.error.description };
        }

        return { symbol, data: data.chart.result[0] };
      })
    );

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
