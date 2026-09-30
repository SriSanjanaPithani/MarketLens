# MarketLens

MarketLens is a full-stack stock market analytics dashboard for exploring historical market performance, technical indicators, company comparisons, and machine-learning price analysis.

The application uses a React frontend, FastAPI backend, PostgreSQL database, and historical market data from yfinance.

## Features

- Analyze historical stock prices over custom date ranges
- View closing prices and trading volume
- Calculate 20-day and 50-day moving averages
- Calculate Relative Strength Index (RSI)
- Calculate MACD, signal line, and MACD histogram
- Compare percentage performance across multiple companies
- Run a linear regression model on historical stock data
- View actual vs. predicted stock prices
- Track model performance using Mean Absolute Error (MAE)
- Save and remove stocks from a PostgreSQL-backed watchlist
- Download processed stock data as CSV
- Validate ticker symbols and date ranges
- Handle unavailable market data and invalid requests

## Tech Stack

### Frontend
- React
- Vite
- JavaScript
- Plotly / react-plotly.js
- CSS

### Backend
- Python
- FastAPI
- Uvicorn
- Pandas
- NumPy
- yfinance
- scikit-learn

### Database
- PostgreSQL
- psycopg2

## Architecture

```text
React Frontend
      |
      | HTTP / REST API
      v
FastAPI Backend
      |
      |---- yfinance -> Historical Market Data
      |
      |---- Pandas / NumPy -> Data Processing
      |
      |---- scikit-learn -> ML Price Analysis
      |
      └---- PostgreSQL -> Watchlist Storage
```

## Machine Learning

MarketLens includes a simple machine-learning demonstration using linear regression.

The model uses:

- Trading volume
- 20-day moving average
- 50-day moving average
- Time progression

The historical dataset is split chronologically, with the first 80% used for training and the final 20% used for testing.

Model performance is evaluated using Mean Absolute Error (MAE), and the dashboard displays actual and predicted closing prices.

> The machine-learning functionality is for educational purposes and should not be considered financial advice.

## API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | API health check |
| GET | `/api/stocks/{ticker}` | Retrieve historical stock data |
| GET | `/api/analysis/{ticker}` | Retrieve stock analysis and technical indicators |
| GET | `/api/prediction/{ticker}` | Run machine-learning analysis |
| GET | `/api/compare` | Compare multiple stocks |
| GET | `/api/watchlist` | Retrieve saved stocks |
| POST | `/api/watchlist/{ticker}` | Add a stock to the watchlist |
| DELETE | `/api/watchlist/{ticker}` | Remove a stock from the watchlist |

## Running Locally

### 1. Clone the repository

```bash
git clone <repository-url>
cd stock_market_analysis
```

### 2. Create the Python environment

```bash
python3.12 -m venv .venv
source .venv/bin/activate
```

### 3. Install backend dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure PostgreSQL

Create a PostgreSQL database and add your credentials to a `.env` file:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_database
DB_USER=your_username
DB_PASSWORD=your_password
```

### 5. Start the backend

```bash
uvicorn backend.main:app --reload
```

The API will run locally on port `8000`.

### 6. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Then open the local Vite address shown in the terminal.

## Project Structure

```text
stock_market_analysis/
├── backend/
│   ├── database.py
│   └── main.py
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   └── index.html
├── src/
│   ├── data_loader.py
│   ├── indicators.py
│   └── model.py
├── requirements.txt
└── README.md
```

## Disclaimer

MarketLens is an educational project. Market data and machine-learning predictions should not be used as financial advice.