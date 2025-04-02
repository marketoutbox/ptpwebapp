export default async function handler(req, res) {
  const { symbol } = req.query;

  try {
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=5y&interval=1d`
    );
    const data = await response.json();

    if (data.chart?.error) {
      throw new Error(data.chart.error.description);
    }

    res.status(200).json(data.chart.result[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
