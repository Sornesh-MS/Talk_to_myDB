/**
 * API client for Talk_to_myDB Flask backend.
 * Uses VITE_API_URL or REACT_APP_API_URL if set, else http://localhost:5000
 */
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env?.REACT_APP_API_URL) ||
  "http://localhost:5000";

const API = {
  post: async (path, data) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(json.error || json.message || `Request failed: ${res.status}`);
    }
    return { data: json };
  },
};

export default API;
