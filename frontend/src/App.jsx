import { useEffect, useState } from "react";
import Plot from "react-plotly.js";
import "./App.css";

// Configuration

const API_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


const plotLayout = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",

  font: {
    color: "#94a3b8",
    family: "Manrope, sans-serif",
  },

  margin: {
    l: 60,
    r: 30,
    t: 30,
    b: 55,
  },

  xaxis: {
    gridcolor: "#1e293b",
    zerolinecolor: "#334155",
  },

  yaxis: {
    gridcolor: "#1e293b",
    zerolinecolor: "#334155",
  },

  hovermode: "x unified",
  autosize: true,
};

// Helper Functions

const formatDate = (dateString) => {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
};

function App() {
  // State
  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  const [ticker, setTicker] = useState("AAPL");
  const [dataRangeWarning, setDataRangeWarning] = useState("");
  const [startDate, setStartDate] = useState("2025-01-01");
  const [endDate, setEndDate] = useState("2026-01-01");

  const [stockData, setStockData] = useState(null);
  const [predictionData, setPredictionData] = useState(null);
  const [predictionError, setPredictionError] = useState("");

  const [watchlist, setWatchlist] = useState([]);

  const [comparisonTickers, setComparisonTickers] =
    useState("AAPL,MSFT,GOOGL");

  const [comparisonStartDate, setComparisonStartDate] =
    useState("2024-01-01");

  const [comparisonEndDate, setComparisonEndDate] =
    useState("2026-01-01");

  const [comparisonData, setComparisonData] = useState(null);

  const [comparisonRangeWarning, setComparisonRangeWarning] = useState("");
  const [comparisonTickerWarning, setComparisonTickerWarning] = useState("");

  const [loading, setLoading] = useState(false);
  const [comparisonLoading, setComparisonLoading] =
    useState(false);

  const [error, setError] = useState("");
  const [comparisonError, setComparisonError] =
    useState("");

  useEffect(() => {
    loadWatchlist();
  }, []);

  // Stock Analysis

  async function analyzeStock(selectedTicker = ticker) {
    const symbol = selectedTicker.trim().toUpperCase();

    if (!symbol) {
      setError("Please enter a ticker.");
      return;
    }

    if (startDate >= endDate) {
      setError("Start date must come before end date.");
      return;
    }

    if (startDate > today || endDate > today) 
    {
      setError("Dates cannot be in the future.");
      return;
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);

    const daysDifference =
      (end - start) / (1000 * 60 * 60 * 24);

    if (daysDifference < 5) {
      setError(
        "Please select a date range of at least 5 days for stock analysis."
      );
      return;
    }

    setTicker(symbol);
    setLoading(true);
    setError("");
    setStockData(null);
    setPredictionData(null);
    setPredictionError("");
    setDataRangeWarning("");
    setComparisonRangeWarning("");

    try {
      const analysisUrl =
        `${API_URL}/api/analysis/${symbol}` +
        `?start_date=${startDate}&end_date=${endDate}`;

      const analysisResponse = await fetch(analysisUrl);

      if (!analysisResponse.ok) 
      {
        const result = await analysisResponse
          .json()
          .catch(() => null);

        throw new Error(
          result?.detail || "Unable to retrieve stock data."
        );
      }

      const analysisResult = await analysisResponse.json();
      const availableStart = analysisResult.available_start_date;
      const availableEnd = analysisResult.available_end_date;

      if (availableStart && startDate < availableStart) {
        const requested = new Date(`${startDate}T00:00:00`);
        const available = new Date(`${availableStart}T00:00:00`);

        const daysDifference =
          (available - requested) / (1000 * 60 * 60 * 24);

        if (daysDifference > 7) {
          setDataRangeWarning(
            `${symbol} data is not available as far back as ${formatDate(
              startDate
            )}. Available market data begins ${formatDate(
              availableStart
            )}, so the analysis starts there.`
          );
        }
      }
      setStockData(analysisResult);

      const predictionUrl =
        `${API_URL}/api/prediction/${symbol}` +
        `?start_date=${startDate}&end_date=${endDate}`;

      try {
        const predictionResponse = await fetch(predictionUrl);

        const predictionResult = await predictionResponse
          .json()
          .catch(() => null);

        if (predictionResponse.ok) {
          setPredictionData(predictionResult);
          setPredictionError("");
        } else {
          setPredictionData(null);
          setPredictionError(
            predictionResult?.detail ||
              "Unable to run machine learning analysis."
          );
        }
      } catch (err) {
        console.error("Prediction error:", err);
        setPredictionData(null);
        setPredictionError(
          "Unable to connect to the machine learning model."
        );
      }
    } catch (err) {
      setError(err.message || "Unable to analyze stock.");
    } finally {
      setLoading(false);
    }
  }

  // Watchlist Management

  async function loadWatchlist() {
    try {
      const response = await fetch(`${API_URL}/api/watchlist`);

      if (!response.ok) {
        throw new Error("Unable to load watchlist.");
      }

      const result = await response.json();
      setWatchlist(result.watchlist || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function addToWatchlist() {
    const symbol = ticker.trim().toUpperCase();

    if (!symbol) {
      setError("Please enter a ticker.");
      return;
    }

    if (watchlist.includes(symbol)) {
      setError(`${symbol} is already in your watchlist.`);
      return;
    }

    setError("");

    try {
      const response = await fetch(
        `${API_URL}/api/watchlist/${symbol}`,
        {
          method: "POST",
        }
      );

      const result = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        if (response.status === 400) {
          throw new Error(
            result?.detail || "Invalid ticker symbol."
          );
        }

        throw new Error(
          result?.detail || "Unable to add stock to watchlist."
        );
      }

      await loadWatchlist();
    } catch (err) {
      setError(err.message || "Unable to add stock to watchlist.");
    }
  }

  async function removeFromWatchlist(symbol) {
    try {
      const response = await fetch(
        `${API_URL}/api/watchlist/${symbol}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Unable to remove stock from watchlist.");
      }

      await loadWatchlist();
    } catch (err) {
      setError(err.message);
    }
  }

  // Company Comparison

  async function compareCompanies() {
    const symbols = comparisonTickers
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean);

    if (symbols.length < 2) {
      setComparisonError("Enter at least two ticker symbols.");
      return;
    }

    if (comparisonStartDate >= comparisonEndDate) {
      setComparisonError(
        "Comparison start date must come before end date."
      );
      return;
    }

    if (comparisonStartDate > today || comparisonEndDate > today) 
    {
      setComparisonError("Dates cannot be in the future.");
      return;
    }

    const start = new Date(`${comparisonStartDate}T00:00:00`);
    const end = new Date(`${comparisonEndDate}T00:00:00`);

    const daysDifference =
      (end - start) / (1000 * 60 * 60 * 24);

    if (daysDifference < 5) {
      setComparisonError(
        "Please select a date range of at least 5 days for company comparison."
      );
      return;
    }
    
    setComparisonLoading(true);
    setComparisonError("");
    setComparisonData(null);
    setComparisonRangeWarning("");
    setComparisonTickerWarning("");

    try {
      const url =
        `${API_URL}/api/compare` +
        `?tickers=${encodeURIComponent(comparisonTickers)}` +
        `&start_date=${comparisonStartDate}` +
        `&end_date=${comparisonEndDate}`;

      const response = await fetch(url);

      if (!response.ok) {
        const result = await response
          .json()
          .catch(() => null);

        throw new Error(
          result?.detail || "Unable to compare companies."
        );
      }

      const result = await response.json();
      const returnedTickers = result.stocks.map((stock) =>
        stock.ticker.toUpperCase()
      );

      const unavailableTickers = symbols.filter(
        (symbol) => !returnedTickers.includes(symbol.toUpperCase())
      );

      if (unavailableTickers.length > 0) {
        setComparisonTickerWarning(
          `No market data was found for ${unavailableTickers.join(
            ", "
          )}, so ${
            unavailableTickers.length === 1 ? "it was" : "they were"
          } not included in the comparison.`
        );
      }
      const adjustedStocks = result.stocks
        .map((stock) => {
          if (!stock.data || stock.data.length === 0) {
            return null;
          }

          const actualStart = stock.data[0].Date;

          const requested = new Date(`${comparisonStartDate}T00:00:00`);
          const available = new Date(`${actualStart}T00:00:00`);

          const daysDifference =
            (available - requested) / (1000 * 60 * 60 * 24);

          if (daysDifference > 7) {
            return `${stock.ticker}: ${formatDate(actualStart)}`;
          }

          return null;
        })
        .filter(Boolean);

      if (adjustedStocks.length > 0) {
        setComparisonRangeWarning(
          `Some companies do not have market data as far back as ${formatDate(
            comparisonStartDate
          )}. Available data begins at ${adjustedStocks.join(
            ", "
          )}, so each comparison starts from its earliest available date.`
        );
      }
      setComparisonData(result);
    } catch (err) {
      setComparisonError(err.message);
    } finally {
      setComparisonLoading(false);
    }
  }

  // CSV Export
  
  function downloadCSV() {
    if (!stockData?.data?.length) {
      return;
    }

    const rows = stockData.data;
    const columns = Object.keys(rows[0]);

    const escapeCSV = (value) => {
      if (value === null || value === undefined) {
        return "";
      }

      const text = String(value).replace(/"/g, '""');
      return `"${text}"`;
    };

    const csvRows = [
      columns.join(","),
      ...rows.map((row) =>
        columns
          .map((column) => escapeCSV(row[column]))
          .join(",")
      ),
    ];

    const blob = new Blob([csvRows.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${stockData.ticker}_stock_data.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  const rows = stockData?.data || [];
  const latest = rows.length ? rows[rows.length - 1] : null;
  const summary = stockData?.summary;
  const dailyChangePositive =
    (summary?.daily_change_percent ?? 0) >= 0;

  return (
    <div className="app">
      <nav className="navbar">
        <a className="brand" href="#">
          <div className="brand-mark">M</div>

          <div className="brand-copy">
            <span className="brand-name">MarketLens</span>
            <span className="brand-subtitle">Analytics</span>
          </div>
        </a>

        <div className="nav-links">
          <a href="#analysis">Analysis</a>
          <a href="#compare">Compare</a>

          <a
            className="github-link"
            href="https://github.com/SriSanjanaPithani/stock_market_analysis"
            target="_blank"
            rel="noreferrer"
          >
            GitHub
            <span>↗</span>
          </a>
        </div>
      </nav>

      <header className="hero">
        <div className="hero-badge">
          <span className="live-dot" />
          MARKET ANALYTICS PLATFORM
        </div>

        <h1>
          Make sense of the
          <span> market.</span>
        </h1>

        <p>
          Explore historical performance, technical indicators,
          company comparisons, and machine-learning price analysis
          from one interactive dashboard.
        </p>
      </header>

      <section id="analysis" className="dashboard-section">
        <div className="section-label">STOCK ANALYSIS</div>

        <div className="analysis-bar">
          <div className="ticker-input-wrap">
            <span className="ticker-dollar">$</span>

            <input
              className="ticker-input"
              type="text"
              value={ticker}
              placeholder="AAPL"
              onChange={(event) =>
                setTicker(event.target.value.toUpperCase())
              }
            />
          </div>

          <div className="date-control">
            <label>FROM</label>

            <input
              type="date"
              value={startDate}
              min="1962-01-02"
              max={today}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </div>

          <div className="date-arrow">→</div>

          <div className="date-control">
            <label>TO</label>

            <input
              type="date"
              value={endDate}
              min={"1962-01-02"}
              max={today}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </div>

          <button
            className="primary-button analyze-button"
            onClick={() => analyzeStock()}
          >
            Analyze
          </button>

          <button
            className="save-button"
            onClick={addToWatchlist}
            title="Add to watchlist"
          >
            ☆
            <span>Save</span>
          </button>
        </div>

        <div className="watchlist-panel">
          <div className="watchlist-header">
            <div>
              <h3>Watchlist</h3>
              <p>Quickly return to your saved stocks.</p>
            </div>

            <span className="watch-count">
              {watchlist.length} saved
            </span>
          </div>

          {watchlist.length === 0 ? (
            <div className="empty-watchlist">
              <div className="empty-star">☆</div>

              <div>
                <strong>Your watchlist is empty</strong>
                <p>Save a stock above to quickly access it later.</p>
              </div>
            </div>
          ) : (
            <div className="watchlist-grid">
              {watchlist.map((symbol) => (
                <div className="watch-card" key={symbol}>
                  <button
                    className="watch-card-main"
                    onClick={() => analyzeStock(symbol)}
                  >
                    <span className="watch-symbol">{symbol}</span>
                    <span className="watch-action">Analyze →</span>
                  </button>

                  <button
                    className="watch-remove"
                    onClick={() => removeFromWatchlist(symbol)}
                    title={`Remove ${symbol}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && (
          <div className="status-message">
            <span className="loading-dot" />
            Analyzing {ticker}...
          </div>
        )}

        {error && <div className="error-message">{error}</div>}
        {dataRangeWarning && (
          <div className="data-range-warning">
            {dataRangeWarning}
          </div>
        )}

        {stockData && latest && (
          <div className="results">
            <div className="stock-heading">
              <div>
                <div className="stock-title-row">
                  <div className="stock-symbol-icon">
                    {stockData.ticker.charAt(0)}
                  </div>

                  <div>
                    <div className="stock-name-line">
                      <h2>{stockData.ticker}</h2>

                      <span className="market-status">
                        <span className="live-dot" />
                        MARKET DATA
                      </span>
                    </div>

                    <p>
                      Historical market performance · {rows.length} trading days
                    </p>
                  </div>
                </div>
              </div>

              <button className="export-button" onClick={downloadCSV}>
                ↓ Export CSV
              </button>
            </div>

            <div className="metrics-grid">
              <div className="metric-card featured-metric">
                <div className="metric-top">
                  <span className="metric-label">CURRENT PRICE</span>
                  <span className="metric-icon">$</span>
                </div>

                <div className="metric-value">
                  ${Number(summary?.latest_close ?? latest.Close).toFixed(2)}
                </div>

                <span className="metric-caption">
                  Latest closing price
                </span>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  <span className="metric-label">DAILY CHANGE</span>

                  <span
                    className={
                      dailyChangePositive
                        ? "trend-icon positive"
                        : "trend-icon negative"
                    }
                  >
                    {dailyChangePositive ? "↗" : "↘"}
                  </span>
                </div>

                <div className="metric-value">
                  {summary
                    ? `${summary.daily_change >= 0 ? "+" : "-"}$${Math.abs(
                        Number(summary.daily_change)
                      ).toFixed(2)}`
                    : "—"}
                </div>

                {summary && (
                  <span
                    className={
                      dailyChangePositive
                        ? "metric-change positive"
                        : "metric-change negative"
                    }
                  >
                    {dailyChangePositive ? "▲" : "▼"} {Math.abs(
                      Number(summary.daily_change_percent)
                    ).toFixed(2)}
                    %
                  </span>
                )}
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  <span className="metric-label">PERIOD HIGH</span>
                  <span className="metric-icon">↑</span>
                </div>

                <div className="metric-value">
                  {summary
                    ? `$${Number(summary.period_high).toFixed(2)}`
                    : "—"}
                </div>

                <span className="metric-caption">
                  Selected date range
                </span>
              </div>

              <div className="metric-card">
                <div className="metric-top">
                  <span className="metric-label">PERIOD LOW</span>
                  <span className="metric-icon">↓</span>
                </div>

                <div className="metric-value">
                  {summary
                    ? `$${Number(summary.period_low).toFixed(2)}`
                    : "—"}
                </div>

                <span className="metric-caption">
                  Selected date range
                </span>
              </div>
            </div>

            <section className="chart-card main-chart-card">
              <div className="chart-header">
                <div>
                  <span className="chart-eyebrow">PRICE</span>
                  <h3>Price Performance</h3>
                  <p>
                    Closing price with 20-day and 50-day moving averages.
                  </p>
                </div>

                <div className="chart-badge">{stockData.ticker}</div>
              </div>

              <Plot
                data={[
                  {
                    x: rows.map((row) => row.Date),
                    y: rows.map((row) => row.Close),
                    type: "scatter",
                    mode: "lines",
                    name: "Close",
                    line: {
                      color: "#8b5cf6",
                      width: 3,
                    },
                  },
                  {
                    x: rows.map((row) => row.Date),
                    y: rows.map((row) => row["20-Day Average"]),
                    type: "scatter",
                    mode: "lines",
                    name: "20D MA",
                    line: {
                      color: "#22d3ee",
                      width: 1.7,
                    },
                  },
                  {
                    x: rows.map((row) => row.Date),
                    y: rows.map((row) => row["50-Day Average"]),
                    type: "scatter",
                    mode: "lines",
                    name: "50D MA",
                    line: {
                      color: "#f59e0b",
                      width: 1.7,
                    },
                  },
                ]}
                layout={{
                  ...plotLayout,
                  xaxis: {
                    ...plotLayout.xaxis,
                    autorange: true,
                  },
                  yaxis: {
                    ...plotLayout.yaxis,
                    title: "Price ($)",
                  },
                }}
                config={{
                  responsive: true,
                  displaylogo: false,
                }}
                useResizeHandler
                style={{
                  width: "100%",
                  height: "450px",
                }}
              />
            </section>

            <div className="indicator-grid">
              <section className="chart-card">
                <div className="chart-header compact">
                  <div>
                    <span className="chart-eyebrow">MOMENTUM</span>
                    <h3>Relative Strength Index</h3>
                    <p>Momentum measured on a 0–100 scale.</p>
                  </div>

                  {latest.RSI != null && (
                    <div className="indicator-value">
                      {Number(latest.RSI).toFixed(1)}
                    </div>
                  )}
                </div>

                <Plot
                  data={[
                    {
                      x: rows.map((row) => row.Date),
                      y: rows.map((row) => row.RSI),
                      type: "scatter",
                      mode: "lines",
                      name: "RSI",
                      line: {
                        color: "#a78bfa",
                        width: 2,
                      },
                    },
                  ]}
                  layout={{
                    ...plotLayout,
                    margin: {
                      l: 45,
                      r: 15,
                      t: 15,
                      b: 45,
                    },
                    xaxis: {
                      ...plotLayout.xaxis,
                      autorange: true,
                    },
                    yaxis: {
                      ...plotLayout.yaxis,
                      range: [0, 100],
                    },
                    shapes: [
                      {
                        type: "line",
                        xref: "paper",
                        x0: 0,
                        x1: 1,
                        y0: 70,
                        y1: 70,
                        line: {
                          color: "#ef4444",
                          dash: "dot",
                        },
                      },
                      {
                        type: "line",
                        xref: "paper",
                        x0: 0,
                        x1: 1,
                        y0: 30,
                        y1: 30,
                        line: {
                          color: "#22c55e",
                          dash: "dot",
                        },
                      },
                    ],
                  }}
                  config={{
                    responsive: true,
                    displaylogo: false,
                  }}
                  useResizeHandler
                  style={{
                    width: "100%",
                    height: "320px",
                  }}
                />
              </section>

              <section className="chart-card">
                <div className="chart-header compact">
                  <div>
                    <span className="chart-eyebrow">TREND</span>
                    <h3>MACD Momentum</h3>
                    <p>MACD, signal line, and momentum histogram.</p>
                  </div>
                </div>

                <Plot
                  data={[
                    {
                      x: rows.map((row) => row.Date),
                      y: rows.map((row) => row.MACD),
                      type: "scatter",
                      mode: "lines",
                      name: "MACD",
                      line: {
                        color: "#38bdf8",
                        width: 2,
                      },
                    },
                    {
                      x: rows.map((row) => row.Date),
                      y: rows.map((row) => row["Signal Line"]),
                      type: "scatter",
                      mode: "lines",
                      name: "Signal",
                      line: {
                        color: "#f59e0b",
                        width: 2,
                      },
                    },
                    {
                      x: rows.map((row) => row.Date),
                      y: rows.map((row) => row["MACD Histogram"]),
                      type: "bar",
                      name: "Histogram",
                      marker: {
                        color: "#475569",
                      },
                    },
                  ]}
                  layout={{
                    ...plotLayout,
                    margin: {
                      l: 45,
                      r: 15,
                      t: 15,
                      b: 45,
                    },
                  }}
                  config={{
                    responsive: true,
                    displaylogo: false,
                  }}
                  useResizeHandler
                  style={{
                    width: "100%",
                    height: "320px",
                  }}
                />
              </section>
            </div>

            <section className="chart-card">
              <div className="chart-header">
                <div>
                  <span className="chart-eyebrow">ACTIVITY</span>
                  <h3>Trading Volume</h3>
                  <p>
                    Daily number of shares traded during the selected period.
                  </p>
                </div>
              </div>

              <Plot
                data={[
                  {
                    x: rows.map((row) => row.Date),
                    y: rows.map((row) => row.Volume),
                    type: "bar",
                    name: "Volume",
                    marker: {
                      color: "#38bdf8",
                    },
                  },
                ]}
                layout={{
                  ...plotLayout,
                  xaxis: {
                    ...plotLayout.xaxis,
                    autorange: true,
                  },
                  yaxis: {
                    ...plotLayout.yaxis,
                    title: "Shares Traded",
                  },
                }}
                config={{
                  responsive: true,
                  displaylogo: false,
                }}
                useResizeHandler
                style={{
                  width: "100%",
                  height: "360px",
                }}
              />
            </section>

            {predictionError && (
              <section className="chart-card ml-card ml-unavailable-card">
                <div className="chart-header">
                  <div>
                    <span className="chart-eyebrow">MACHINE LEARNING</span>
                    <h3>Machine Learning Analysis Unavailable</h3>
                    <p>{predictionError}</p>
                  </div>

                  <div className="ml-status-icon">!</div>
                </div>
              </section>
            )}

            {predictionData && (
              <section className="chart-card ml-card">
                <div className="chart-header">
                  <div>
                    <span className="chart-eyebrow">MACHINE LEARNING</span>
                    <h3>Regression Model Performance</h3>
                    <p>
                      Actual closing prices compared with model predictions.
                    </p>
                  </div>

                  <div className="mae-box">
                    <span>MEAN ABSOLUTE ERROR</span>
                    <strong>
                      ${Number(predictionData.mean_absolute_error).toFixed(2)}
                    </strong>
                  </div>
                </div>

                <Plot
                  data={[
                    {
                      x: predictionData.predictions.map((row) => row.Date),
                      y: predictionData.predictions.map((row) => row.Actual),
                      type: "scatter",
                      mode: "lines",
                      name: "Actual",
                      line: {
                        color: "#22d3ee",
                        width: 2.7,
                      },
                    },
                    {
                      x: predictionData.predictions.map((row) => row.Date),
                      y: predictionData.predictions.map((row) => row.Predicted),
                      type: "scatter",
                      mode: "lines",
                      name: "Predicted",
                      line: {
                        color: "#c084fc",
                        width: 2,
                        dash: "dot",
                      },
                    },
                  ]}
                  layout={{
                    ...plotLayout,
                    xaxis: {
                      ...plotLayout.xaxis,
                      autorange: true,
                    },
                    yaxis: {
                      ...plotLayout.yaxis,
                      title: "Price ($)",
                    },
                  }}
                  config={{
                    responsive: true,
                    displaylogo: false,
                  }}
                  useResizeHandler
                  style={{
                    width: "100%",
                    height: "420px",
                  }}
                />
              </section>
            )}
          </div>
        )}
      </section>

      <section id="compare" className="compare-section">
        <div className="compare-heading">
          <div>
            <span className="section-label">MARKET COMPARISON</span>
            <h2>Compare Companies</h2>
            <p>
              Normalize multiple stocks to their starting prices and compare
              their performance over the same period.
            </p>
          </div>
        </div>

        <div className="compare-controls">
          <div className="control-group company-control">
            <label>COMPANIES</label>

            <input
              type="text"
              value={comparisonTickers}
              placeholder="AAPL, MSFT, GOOGL"
              onChange={(event) =>
                setComparisonTickers(event.target.value.toUpperCase())
              }
            />

            <span className="input-help">
              Separate ticker symbols with commas
            </span>
          </div>

          <div className="control-group">
            <label>START DATE</label>

            <input
              type="date"
              value={comparisonStartDate}
              min="1962-01-02"
              max={today}
              onChange={(event) =>
                setComparisonStartDate(event.target.value)
              }
            />
          </div>

          <div className="control-group">
            <label>END DATE</label>

            <input
              type="date"
              value={comparisonEndDate}
              min={"1962-01-02"}
              max={today}
              onChange={(event) =>
                setComparisonEndDate(event.target.value)
              }
            />
          </div>

          <button
            className="primary-button compare-button"
            onClick={compareCompanies}
          >
            Compare Stocks
          </button>
        </div>

        {comparisonRangeWarning && (
          <div className="data-range-warning">
            {comparisonRangeWarning}
          </div>
        )}

        {comparisonTickerWarning && (
          <div className="data-range-warning">
            {comparisonTickerWarning}
          </div>
        )}
        {comparisonLoading && (
          <div className="status-message">
            <span className="loading-dot" />
            Comparing companies...
          </div>
        )}

        {comparisonError && (
          <div className="error-message">{comparisonError}</div>
        )}

        {comparisonData?.stocks?.length > 0 && (
          <div className="comparison-results">
            <div className="comparison-metrics">
              {comparisonData.stocks.map((stock) => (
                <div className="comparison-stock-card" key={stock.ticker}>
                  <span className="comparison-symbol">{stock.ticker}</span>

                  <strong
                    className={stock.total_change >= 0 ? "positive" : "negative"}
                  >
                    {stock.total_change >= 0 ? "+" : ""}
                    {Number(stock.total_change).toFixed(2)}%
                  </strong>

                  <span>
                    ${Number(stock.starting_price).toFixed(2)}
                    {" → "}
                    ${Number(stock.ending_price).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="comparison-chart">
              <div className="chart-header">
                <div>
                  <span className="chart-eyebrow">RELATIVE PERFORMANCE</span>
                  <h3>Performance From Starting Price</h3>
                  <p>
                    Each stock begins at 0% for a direct performance comparison.
                  </p>
                </div>
              </div>

              <Plot
                data={comparisonData.stocks.map((stock, index) => {
                  const colors = [
                    "#8b5cf6",
                    "#22d3ee",
                    "#f472b6",
                    "#f59e0b",
                    "#4ade80",
                    "#60a5fa",
                  ];

                  return {
                    x: stock.data.map((row) => row.Date),
                    y: stock.data.map((row) => row["Percent Change"]),
                    type: "scatter",
                    mode: "lines",
                    name: stock.ticker,
                    line: {
                      color: colors[index % colors.length],
                      width: 2.7,
                    },
                  };
                })}
                layout={{
                  ...plotLayout,
                  xaxis: {
                    ...plotLayout.xaxis,
                    autorange: true,
                  },
                  yaxis: {
                    ...plotLayout.yaxis,
                    title: "Change From Starting Price",
                    ticksuffix: "%",
                  },
                  shapes: [
                    {
                      type: "line",
                      xref: "paper",
                      x0: 0,
                      x1: 1,
                      y0: 0,
                      y1: 0,
                      line: {
                        color: "#64748b",
                        dash: "dash",
                      },
                    },
                  ],
                }}
                config={{
                  responsive: true,
                  displaylogo: false,
                }}
                useResizeHandler
                style={{
                  width: "100%",
                  height: "480px",
                }}
              />
            </div>
          </div>
        )}
      </section>

      <footer className="footer">
        <div>
          <strong>MarketLens</strong>
          <span>
            Built with React, FastAPI, PostgreSQL, Pandas & scikit-learn.
          </span>
        </div>

        <span>Market data for analytical purposes.</span>
      </footer>
    </div>
  );
}

export default App;