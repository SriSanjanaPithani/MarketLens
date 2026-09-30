from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from src.data_loader import download_stock_data
from src.indicators import calculate_indicators
from src.model import train_model
from backend.database import get_connection

import numpy as np


app = FastAPI(
    title="Stock Market Analysis API",
    description="Backend API for stock analysis, technical indicators, machine learning, comparisons, and watchlists.",
    version="1.0.0",
)


# CORS

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Helpers

def clean_value(value):
    """
    Convert NumPy values into JSON-safe Python values.
    NaN and infinity become None.
    """
    if value is None:
        return None

    if isinstance(value, (np.integer,)):
        return int(value)

    if isinstance(value, (np.floating,)):
        if np.isnan(value) or np.isinf(value):
            return None
        return float(value)

    if isinstance(value, float):
        if np.isnan(value) or np.isinf(value):
            return None

    return value


def dataframe_to_records(df):
    """
    Convert a Pandas DataFrame to JSON-safe records.
    """
    dataframe = df.copy()

    # If Date is still the index, turn it into a normal column.
    if "Date" not in dataframe.columns:
        dataframe = dataframe.reset_index()

    records = []

    for _, row in dataframe.iterrows():
        record = {}

        for column in dataframe.columns:
            value = row[column]

            if column == "Date":
                try:
                    value = value.isoformat()
                except AttributeError:
                    value = str(value)

            record[column] = clean_value(value)

        records.append(record)

    return records


# Health Check

@app.get("/")
def root():
    return {
        "message": "Stock Market Analysis API is running"
    }


# Stock Data

@app.get("/api/stocks/{ticker}")
def get_stock(
    ticker: str,
    start_date: str,
    end_date: str,
):
    try:
        ticker = ticker.upper().strip()

        df = download_stock_data(
            ticker,
            start_date,
            end_date,
        )

        if df is None or df.empty:
            raise HTTPException(
                status_code=404,
                detail=(
                    f"No market data found for {ticker} "
                    "during the selected date range. "
                    "Check the ticker symbol and dates."
                )
            )

        return {
            "ticker": ticker,
            "start_date": start_date,
            "end_date": end_date,
            "data": dataframe_to_records(df),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Stock data error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to retrieve stock data",
        )


# Stock Analysis + Indicators

@app.get("/api/analysis/{ticker}")
def analyze_stock(
    ticker: str,
    start_date: str,
    end_date: str,
):
    try:
        ticker = ticker.upper().strip()

        # Download stock data
        df = download_stock_data(
            ticker,
            start_date,
            end_date,
        )

        # No data usually means the ticker is invalid
        # or unavailable for the selected range
        if df is None or df.empty:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No market data found for {ticker} "
                    "during the selected date range. "
                    "Check the ticker symbol and dates."
                ),
            )

        # Calculate technical indicators
        df = calculate_indicators(df)

        if df is None or df.empty:
            raise HTTPException(
                status_code=400,
                detail="Not enough stock data to calculate indicators.",
            )

        available_start = df["Date"].iloc[0].strftime("%Y-%m-%d")
        available_end = df["Date"].iloc[-1].strftime("%Y-%m-%d")

        # Summary statistics
        latest_close = float(df["Close"].iloc[-1])

        previous_close = (
            float(df["Close"].iloc[-2])
            if len(df) > 1
            else latest_close
        )

        daily_change = latest_close - previous_close

        daily_change_percent = (
            (daily_change / previous_close) * 100
            if previous_close != 0
            else 0
        )

        period_high = float(df["High"].max())
        period_low = float(df["Low"].min())

        return {
            "ticker": ticker,
            "start_date": start_date,
            "end_date": end_date,
            "available_start_date": available_start,
            "available_end_date": available_end,
            "summary": {
                "latest_close": latest_close,
                "daily_change": daily_change,
                "daily_change_percent": daily_change_percent,
                "period_high": period_high,
                "period_low": period_low,
                "trading_days": len(df),
            },
            "data": dataframe_to_records(df),
        }

    except HTTPException:
        raise

    except Exception as e:
        print(f"Analysis error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to analyze stock.",
        )

# Machine Learning Prediction

@app.get("/api/prediction/{ticker}")
def predict_stock(
    ticker: str,
    start_date: str,
    end_date: str,
):
    try:
        ticker = ticker.upper().strip()

        # Download historical stock data
        df = download_stock_data(
            ticker,
            start_date,
            end_date,
        )

        if df is None or df.empty:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid ticker symbol or no data available "
                    "for the selected date range."
                ),
            )

        # Calculate technical indicators used by the model
        df = calculate_indicators(df)

        if df is None or df.empty:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Not enough data for machine learning analysis. "
                    "Select a larger date range."
                ),
            )

        # Train model and generate test predictions
        result = train_model(df)

        if result is None:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Not enough data for machine learning analysis. "
                    "Select a larger date range."
                ),
            )

        return result

    except HTTPException:
        raise

    except Exception as e:
        print(f"Prediction error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to run machine learning analysis.",
        )

# Compare Companies

@app.get("/api/compare")
def compare_stocks(
    tickers: str,
    start_date: str,
    end_date: str,
):
    symbols = [
        symbol.strip().upper()
        for symbol in tickers.split(",")
        if symbol.strip()
    ]

    # Remove duplicates while keeping order.
    symbols = list(dict.fromkeys(symbols))

    if len(symbols) < 2:
        raise HTTPException(
            status_code=400,
            detail="Enter at least two ticker symbols",
        )

    results = []

    for symbol in symbols:
        try:
            df = download_stock_data(
                symbol,
                start_date,
                end_date,
            )

            if df is None or df.empty:
                continue

            dataframe = df.copy()

            if "Date" not in dataframe.columns:
                dataframe = dataframe.reset_index()

            starting_price = float(
                dataframe["Close"].iloc[0]
            )

            dataframe["Percent Change"] = (
                (
                    dataframe["Close"]
                    - starting_price
                )
                / starting_price
            ) * 100

            stock_data = []

            for _, row in dataframe.iterrows():
                date_value = row["Date"]

                try:
                    date_value = date_value.strftime(
                        "%Y-%m-%d"
                    )
                except AttributeError:
                    date_value = str(date_value)

                stock_data.append({
                    "Date": date_value,
                    "Percent Change": float(
                        row["Percent Change"]
                    ),
                })

            results.append({
                "ticker": symbol,
                "starting_price": starting_price,
                "ending_price": float(
                    dataframe["Close"].iloc[-1]
                ),
                "total_change": float(
                    dataframe[
                        "Percent Change"
                    ].iloc[-1]
                ),
                "data": stock_data,
            })

        except Exception as e:
            print(
                f"Comparison error for {symbol}: {e}"
            )

    if not results:
        raise HTTPException(
            status_code=404,
            detail=(
                f"No market data found for {', '.join(symbols)} "
                "during the selected date range. "
                "Check the ticker symbols and dates."
            )
        )

    return {
        "start_date": start_date,
        "end_date": end_date,
        "stocks": results,
    }


# Watchlist

@app.get("/api/watchlist")
def get_watchlist():
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT ticker
            FROM watchlist
            ORDER BY ticker;
            """
        )

        rows = cursor.fetchall()

        return {
            "watchlist": [
                row[0]
                for row in rows
            ]
        }

    except Exception as e:
        print(f"Watchlist error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to load watchlist",
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.post("/api/watchlist/{ticker}")
def add_to_watchlist(ticker: str):
    connection = None
    cursor = None

    ticker = ticker.upper().strip()

    try:
        # Validate ticker before saving it
        stock_data = download_stock_data(
            ticker,
            "2025-01-01",
            "2025-01-10"
        )

        if stock_data is None or stock_data.empty:
            raise HTTPException(
                status_code=400,
                detail="Invalid ticker symbol or no data available.",
            )

        # Only connect to the database after validation succeeds
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            INSERT INTO watchlist (ticker)
            VALUES (%s)
            ON CONFLICT (ticker) DO NOTHING;
            """,
            (ticker,),
        )

        connection.commit()

        return {
            "message": f"{ticker} added to watchlist"
        }

    except HTTPException:
        raise

    except Exception as e:
        if connection:
            connection.rollback()

        print(f"Add watchlist error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to add stock to watchlist",
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


@app.delete("/api/watchlist/{ticker}")
def remove_from_watchlist(ticker: str):
    connection = None
    cursor = None

    ticker = ticker.upper().strip()

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            DELETE FROM watchlist
            WHERE ticker = %s;
            """,
            (ticker,),
        )

        connection.commit()

        return {
            "message": f"{ticker} removed from watchlist"
        }

    except Exception as e:
        if connection:
            connection.rollback()

        print(f"Remove watchlist error: {e}")

        raise HTTPException(
            status_code=500,
            detail="Unable to remove stock from watchlist",
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()