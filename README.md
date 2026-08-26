# Stock Market Analysis Dashboard

An interactive Streamlit application for analyzing historical stock performance, technical indicators, multi-company comparisons, and a simple machine-learning model.

## Live Demo

[View the Live Stock Market Analysis Dashboard](https://srisanjana-stock-analysis.streamlit.app)

## Features

- Download historical stock data with yfinance
- View interactive closing-price charts
- Calculate 20-day and 50-day moving averages
- Calculate RSI
- Calculate MACD
- Compare multiple companies by percentage performance
- Select custom date ranges
- Download processed data as CSV
- Evaluate a simple linear-regression model

## Technologies Used

- Python
- pandas
- NumPy
- yfinance
- Plotly
- Streamlit
- scikit-learn

## Project Structure

```text
stock-dashboard/
├── app.py
├── README.md
├── requirements.txt
└── src/
    ├── __init__.py
    ├── data_loader.py
    ├── indicators.py
    └── model.py