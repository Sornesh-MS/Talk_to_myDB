// frontend/src/App.jsx

import { useState } from "react";

function App() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [sql, setSql] = useState("");
  const [results, setResults] = useState([]);
  const [error, setError] = useState("");

  const API_URL = (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) || "http://localhost:5000";

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSql("");
    setResults([]);
    setError("");

    try {
      const res = await fetch(`${API_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: query })
      });

      if (!res.ok) {
        const maybeJson = await res.json().catch(() => ({}));
        const msg = maybeJson.error || `HTTP ${res.status}`;
        throw new Error(msg);
      }

      const data = await res.json();
      setSql(data.sql);
      setResults(data.results || []);
    } catch (err) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">🗄️ Talk to MyDB</h1>

        <div className="p-4 shadow-lg rounded-2xl bg-white">
          <div className="flex gap-2 mb-4">
            <input
              className="flex-1 border rounded px-3 py-2"
              type="text"
              placeholder="Ask your database (e.g. show all customers)..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button
              className="border rounded px-4 py-2 bg-black text-white disabled:opacity-60"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? "Loading..." : "Submit"}
            </button>
          </div>

          {error && (
            <div className="mb-3 text-red-600 text-sm">❌ {error}</div>
          )}

          {sql && (
            <div className="bg-gray-200 p-3 rounded-lg font-mono text-sm mb-4">
              <strong>Generated SQL:</strong> {sql}
            </div>
          )}

          {results.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300">
                <thead>
                  <tr>
                    {Object.keys(results[0]).map((col) => (
                      <th
                        key={col}
                        className="border border-gray-300 px-3 py-2 bg-gray-100"
                      >
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={idx}>
                      {Object.values(row).map((val, i) => (
                        <td
                          key={i}
                          className="border border-gray-300 px-3 py-2"
                        >
                          {val !== null ? val.toString() : "-"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-3">API: {API_URL}/query</div>
      </div>
    </div>
  );
}

export default App;
