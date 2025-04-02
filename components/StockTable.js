export default function StockTable({ stocks }) {
  return (
    <table border="1">
      <thead>
        <tr>
          <th>Date</th>
          <th>Symbol</th>
          <th>Open</th>
          <th>High</th>
          <th>Low</th>
          <th>Close</th>
        </tr>
      </thead>
      <tbody>
        {stocks.map((stock, index) => (
          <tr key={index}>
            <td>{stock.date}</td>
            <td>{stock.symbol}</td>
            <td>{stock.open}</td>
            <td>{stock.high}</td>
            <td>{stock.low}</td>
            <td>{stock.close}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
