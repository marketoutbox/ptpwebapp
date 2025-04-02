import Link from "next/link";

export default function Home() {
  return (
    <div style={{ textAlign: "center", padding: "50px" }}>
      <h1>Welcome to Stock Data App</h1>
      <p>Fetch and store historical stock data efficiently using IndexedDB.</p>
      <Link href="/stocks">
        <button style={{ padding: "10px", fontSize: "16px", cursor: "pointer" }}>
          Go to Stock Data Page
        </button>
      </Link>
    </div>
  );
}
