import { useState, useEffect } from "react";
import API from "./services/api";

// --- Sub-Component: Animated Button ---
const AnimatedButton = ({ onClick, disabled, children, bg, color = "white" }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const style = {
    padding: "12px 28px",
    fontSize: "15px",
    fontWeight: "600",
    borderRadius: "10px",
    border: "none",
    backgroundColor: disabled ? "#cbd5e0" : bg,
    color: color,
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
    transform: isActive ? "scale(0.94)" : isHovered ? "scale(1.04)" : "scale(1)",
    boxShadow: isHovered && !disabled ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)" : "none",
    minWidth: "110px",
    outline: "none",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsActive(false); }}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      style={style}
    >
      {children}
    </button>
  );
};

// --- Format content as plain text (not JSON) ---
const formatAsPlainText = (content) => {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return content != null ? String(content) : "";
  if (content.length === 0) return "(No rows found)";
  const headers = Object.keys(content[0]);
  const colWidths = headers.map((h) =>
    Math.max(h.length, ...content.map((r) => String(r[h] ?? "").length), 4)
  );
  const sep = colWidths.map((w) => "-".repeat(w)).join("-+-");
  const pad = (s, w) => String(s ?? "").padEnd(w).slice(0, w);
  const headerRow = headers.map((h, i) => pad(h, colWidths[i])).join(" | ");
  const rows = content.map((row) =>
    headers.map((h, i) => pad(row[h], colWidths[i])).join(" | ")
  );
  return [headerRow, sep, ...rows].join("\n");
};

// --- Sub-Component: Refined Data Box ---
const DataBox = ({ title, content, isMobile, delay, darkMode }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const handleCopy = async (e) => {
    e.stopPropagation();
    try {
      const textToCopy = formatAsPlainText(content);
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy!", err);
    }
  };

  const handleDownloadCSV = (e) => {
    e.stopPropagation();
    let csvContent = "";
    // If content is an array of objects, convert to CSV
    if (Array.isArray(content) && content.length > 0) {
      const headers = Object.keys(content[0]);
      csvContent += headers.join(",") + "\n";
      content.forEach(row => {
        csvContent += headers.map(header => JSON.stringify(row[header] ?? "")).join(",") + "\n";
      });
    } else {
      // If it's just a string or single object, download as text
      csvContent = typeof content === "string" ? content : JSON.stringify(content, null, 2);
    }
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${title.replace(/\s+/g, '_').toLowerCase()}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isPlaceholder = typeof content === "string" && (content.includes("will appear here") || content.includes("Processing"));

  const containerStyle = {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    borderRadius: "16px",
    backgroundColor: darkMode ? "#1e293b" : "#ffffff",
    boxShadow: isHovered 
      ? "0 20px 25px -5px rgba(0, 0, 0, 0.2)" 
      : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
    transform: isVisible 
      ? (isHovered ? "translateY(-6px)" : "translateY(0)") 
      : "translateY(30px)",
    opacity: isVisible ? 1 : 0,
    transition: "all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1)",
    height: isMobile ? "450px" : "100%",
    minWidth: isMobile ? "100%" : "300px",
    overflow: "hidden",
    border: darkMode 
        ? (isHovered ? "1px solid #80a6e0" : "1px solid #334155")
        : (isHovered ? "1px solid #80a6e0" : "1px solid #e2e8f0"),
  };

  const headerStyle = {
    backgroundColor: isHovered ? "#80a6e0" : (darkMode ? "#0f172a" : "#2d3748"),
    color: "white",
    padding: "10px 20px",
    fontWeight: "700",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "1.5px",
    transition: "background-color 0.3s ease",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };

  const actionButtonStyle = {
    backgroundColor: "rgba(255,255,255,0.2)",
    border: "none",
    borderRadius: "4px",
    color: "white",
    padding: "4px 8px",
    cursor: "pointer",
    fontSize: "10px",
    fontWeight: "bold",
    transition: "all 0.2s ease",
    marginLeft: "8px"
  };

  return (
    <div style={containerStyle} onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <div style={headerStyle}>
        <span>{title}</span>
        <div style={{ display: "flex" }}>
          {/* UPDATED: Shows CSV button for "Result" or "Output" boxes */}
          {!isPlaceholder && (title.includes("Result") || title.includes("Output")) && (
            <button onClick={handleDownloadCSV} style={actionButtonStyle}>CSV</button>
          )}
          {!isPlaceholder && (
            <button onClick={handleCopy} style={{...actionButtonStyle, backgroundColor: copied ? "#BFC9D1" : "rgba(255,255,255,0.2)"}}>
              {copied ? "✓" : "COPY"}
            </button>
          )}
        </div>
      </div>
      <div style={{ 
        flex: 1, 
        overflowY: "auto", 
        padding: "24px", 
        background: darkMode ? "#0f172a" : (title.includes("SQL") ? "#f8fafc" : "#ffffff"),
        display: isPlaceholder ? "flex" : "block",
        alignItems: "center",
        justifyContent: "center"
      }}>
        <pre style={{ 
          whiteSpace: "pre-wrap", 
          margin: 0, 
          color: isPlaceholder ? (darkMode ? "#475569" : "#94a3b8") : (darkMode ? "#e2e8f0" : "#1e293b"), 
          fontFamily: title.includes("SQL") ? "'Fira Code', monospace" : "inherit",
          fontSize: "14px",
          lineHeight: "1.6",
          textAlign: isPlaceholder ? "center" : "left",
          width: "100%"
        }}>
          {formatAsPlainText(content)}
        </pre>
      </div>
    </div>
  );
};

// --- Main Component ---
function TalkToMyDB() {
  const [need, setNeed] = useState("");
  const [sql, setSql] = useState("-- SQL will appear here --");
  const [result, setResult] = useState("...Result will appear here...");
  const [loading, setLoading] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSubmit = async () => {
    if (!need.trim()) return;
    setLoading(true);
    setSql("-- Processing SQL... --");
    setResult("Processing result...");
    try {
      const res = await API.post("/talktomydb", { need });
      setSql(res.data.sql || "-- No SQL returned --");
      setResult(res.data.result || "No result returned");
    } catch (error) {
      setSql("-- Error generating SQL --");
      setResult(error?.message || "Error connecting to backend. Is Flask running on port 5000?");
    }
    setLoading(false);
  };

  return (
    <div style={{ 
      fontFamily: "'Inter', -apple-system, sans-serif", 
      height: "100vh", 
      width: "100vw",
      display: "flex", 
      flexDirection: "column", 
      backgroundColor: darkMode ? "#0f172a" : "#f1f5f9",
      color: darkMode ? "#f1f5f9" : "#1e293b",
      transition: "all 0.3s ease",
      overflow: "hidden" 
    }}>
      
      {/* Navbar/Header */}
      <div style={{
        padding: "20px 40px",
        backgroundColor: darkMode ? "#1e293b" : "#80a6e0",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        zIndex: 10,
        transition: "background-color 0.3s ease",
        boxSizing: "border-box"
      }}>
        <div style={{ fontSize: "30px", fontWeight: "800" }}>Talk to my DB</div>
        <button 
          onClick={() => setDarkMode(!darkMode)}
          style={{
            background: "rgba(255, 255, 255, 0.15)",
            border: "1px solid rgba(255, 255, 255, 0.3)",
            borderRadius: "50px",
            padding: "8px 16px",
            cursor: "pointer",
            color: "white",
            fontWeight: "600",
            fontSize: "11px"
          }}
        >
          {darkMode ? "☀️ LIGHT" : "🌙 DARK"}
        </button>
      </div>

      <div style={{
        flex: 1,
        margin: isMobile ? "10px auto" : "15px auto", 
        maxWidth: isMobile ? "95%" : "1000px", 
        width: "90%",
        minHeight: isMobile ? "auto" : "82vh", 
        padding: isMobile ? "15px" : "30px",
        borderRadius: "24px",
        backgroundColor: darkMode ? "#0f172a" : "#d1e1f0",
        border: darkMode ? "1px solid #80a6e0" : "1px solid #80a6e0",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        gap: "25px",
        boxSizing: "border-box",
        overflow: "hidden",
      }}>
        {/* Control Bar Section */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          alignItems: "center",
          gap: "16px",
          width: "100%",
        }}>
          <input
            type="text"
            placeholder="e.g  Show me the driver names"
            value={need}
            onChange={(e) => setNeed(e.target.value)}
            style={{
              flex: 1,
              width: "100%",
              padding: "16px 20px",
              fontSize: "16px",
              borderRadius: "12px",
              border: darkMode ? "2px solid #334155" : "2px solid #e2e8f0",
              outline: "none",
              backgroundColor: darkMode ? "#0f172a" : "#fff",
              color: darkMode ? "#fff" : "#1e293b",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.02)"
            }}
          />
          <div style={{ display: "flex", gap: "12px", width: isMobile ? "100%" : "auto" }}>
            <AnimatedButton onClick={handleSubmit} disabled={loading} bg="#4a90e2">
              {loading ? "..." : "Submit"}
            </AnimatedButton>
            <AnimatedButton 
              onClick={() => setNeed("")} 
              bg={darkMode ? "#637185" : "#ffffff"} 
              color={darkMode ? "#e2e8f0" : "#475569"}
            >
              Clear
            </AnimatedButton>
          </div>
        </div>

        {/* Display Section */}
        <div style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          gap: "24px",
          flex: 1,
          minHeight: 0,
        }}>
          <DataBox 
            title="SQL Query" 
            content={sql} 
            isMobile={isMobile} 
            delay={150} 
            darkMode={darkMode} 
          />
          <DataBox 
            title="Output" 
            content={result} 
            isMobile={isMobile} 
            delay={350} 
            darkMode={darkMode} 
          />
        </div>
      </div>
    </div>
  );
}

export default TalkToMyDB;