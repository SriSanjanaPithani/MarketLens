import pandas as pd
import yfinance as yf


def download_stock_data(ticker, start_date, end_date):
    stock_data = yf.download(
        ticker,
        start=start_date,
        end=end_date,
        auto_adjust=False,
        progress=False
    )

    if stock_data.empty:
        return None

    if isinstance(stock_data.columns, pd.MultiIndex):
        stock_data.columns = stock_data.columns.get_level_values(0)

    stock_data = stock_data.reset_index()

    return stock_data