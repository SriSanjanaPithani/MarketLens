import streamlit as st
import pandas as pd
import plotly.graph_objects as go

from src.data_loader import download_stock_data
from src.indicators import calculate_indicators
from src.model import train_model

st.set_page_config(
    page_title="Stock Dashboard",
    page_icon="📈",
    layout="wide"
)

st.title("📈 Stock Market Analysis Dashboard")
st.write("Analyze historical prices and financial indicators.")

ticker = st.text_input(
    "Enter a stock symbol",
    value="AAPL"
).upper().strip()

start_date = st.date_input(
    "Start date",
    value=pd.to_datetime("2024-01-01")
)

end_date = st.date_input(
    "End date",
    value=pd.to_datetime("today")
)

if start_date >= end_date:
    st.error("The start date must come before the end date.")
    st.stop()

stock_data = download_stock_data(
    ticker,
    start_date,
    end_date
)

if stock_data is None:
    st.error("No data was found. Check the stock symbol and dates.")
    st.stop()

stock_data = calculate_indicators(stock_data)

st.success(f"Loaded {len(stock_data)} trading days for {ticker}.")

st.subheader("Stock Data")
st.dataframe(stock_data, use_container_width=True)

latest_close = stock_data["Close"].iloc[-1]
previous_close = stock_data["Close"].iloc[-2]
price_change = latest_close - previous_close
percent_change = (price_change / previous_close) * 100
highest_price = stock_data["High"].max()
lowest_price = stock_data["Low"].min()

column1, column2, column3, column4 = st.columns(4)

column1.metric(
    "Latest closing price",
    f"${latest_close:,.2f}"
)

column2.metric(
    "Daily change",
    f"${price_change:,.2f}",
    f"{percent_change:.2f}%"
)

column3.metric(
    "Period high",
    f"${highest_price:,.2f}"
)

column4.metric(
    "Period low",
    f"${lowest_price:,.2f}"
)

st.subheader(f"{ticker} Closing Price")

price_chart = go.Figure()

price_chart.add_trace(
    go.Scatter(
        x=stock_data["Date"],
        y=stock_data["Close"],
        mode="lines",
        name="Closing Price"
    )
)

price_chart.add_trace(
    go.Scatter(
        x=stock_data["Date"],
        y=stock_data["20-Day Average"],
        mode="lines",
        name="20-Day Moving Average"
    )
)

price_chart.add_trace(
    go.Scatter(
        x=stock_data["Date"],
        y=stock_data["50-Day Average"],
        mode="lines",
        name="50-Day Moving Average"
    )
)

price_chart.update_layout(
    xaxis_title="Date",
    yaxis_title="Price ($)",
    hovermode="x unified"
)

st.plotly_chart(
    price_chart,
    use_container_width=True
)

st.subheader("Trading Volume")

volume_chart = go.Figure()

volume_chart.add_trace(
    go.Bar(
        x=stock_data["Date"],
        y=stock_data["Volume"],
        name="Volume"
    )
)

volume_chart.update_layout(
    xaxis_title="Date",
    yaxis_title="Shares Traded"
)

st.plotly_chart(
    volume_chart,
    use_container_width=True
)

st.subheader("Relative Strength Index")

rsi_chart = go.Figure()

rsi_chart.add_trace(
    go.Scatter(
        x=stock_data["Date"],
        y=stock_data["RSI"],
        mode="lines",
        name="RSI"
    )
)

rsi_chart.add_hline(
    y=70,
    line_dash="dash",
    annotation_text="Overbought"
)

rsi_chart.add_hline(
    y=30,
    line_dash="dash",
    annotation_text="Oversold"
)

rsi_chart.update_layout(
    xaxis_title="Date",
    yaxis_title="RSI",
    yaxis_range=[0, 100]
)

st.plotly_chart(
    rsi_chart,
    use_container_width=True
)

st.subheader("MACD")

macd_chart = go.Figure()

macd_chart.add_trace(
    go.Scatter(
        x=stock_data["Date"],
        y=stock_data["MACD"],
        mode="lines",
        name="MACD"
    )
)

macd_chart.add_trace(
    go.Scatter(
        x=stock_data["Date"],
        y=stock_data["Signal Line"],
        mode="lines",
        name="Signal Line"
    )
)

macd_chart.add_trace(
    go.Bar(
        x=stock_data["Date"],
        y=stock_data["MACD Histogram"],
        name="MACD Histogram"
    )
)

macd_chart.update_layout(
    xaxis_title="Date",
    yaxis_title="MACD"
)

st.plotly_chart(
    macd_chart,
    use_container_width=True
)

csv_data = stock_data.to_csv(index=False)

st.download_button(
    label="Download data as CSV",
    data=csv_data,
    file_name=f"{ticker}_stock_data.csv",
    mime="text/csv"
)

st.subheader("Compare Companies")

st.write(
    "Compare how much each stock increased or decreased as a "
    "percentage of its starting price."
)

comparison_text = st.text_input(
    "Enter symbols separated by commas",
    value="AAPL, MSFT, GOOGL",
    key="comparison_symbols"
)

comparison_column1, comparison_column2 = st.columns(2)

with comparison_column1:
    comparison_start_date = st.date_input(
        "Comparison start date",
        value=pd.to_datetime("2024-01-01"),
        key="comparison_start"
    )

with comparison_column2:
    comparison_end_date = st.date_input(
        "Comparison end date",
        value=pd.to_datetime("today"),
        key="comparison_end"
    )

if comparison_start_date >= comparison_end_date:
    st.error(
        "The comparison start date must come before the "
        "comparison end date."
    )
else:
    comparison_symbols = [
        symbol.strip().upper()
        for symbol in comparison_text.split(",")
        if symbol.strip()
    ]

    comparison_chart = go.Figure()

    for symbol in comparison_symbols:
        comparison_data = download_stock_data(
            symbol,
            comparison_start_date,
            comparison_end_date
        )

        if comparison_data is None:
            st.warning(f"No comparison data was found for {symbol}.")
            continue

        starting_price = comparison_data["Close"].iloc[0]

        comparison_data["Percent Change"] = (
            (
                comparison_data["Close"] /
                starting_price
            ) - 1
        ) * 100

        comparison_chart.add_trace(
            go.Scatter(
                x=comparison_data["Date"],
                y=comparison_data["Percent Change"],
                mode="lines",
                name=symbol
            )
        )

    comparison_chart.add_hline(
        y=0,
        line_dash="dash"
    )

    comparison_chart.update_layout(
        xaxis_title="Date",
        yaxis_title="Change From Starting Price (%)",
        hovermode="x unified",
        height=600
    )

    st.plotly_chart(
        comparison_chart,
        use_container_width=True
    )

st.subheader("Simple Machine-Learning Demonstration")

st.warning(
    "This model is for educational purposes only and should not "
    "be used as financial advice."
)

model_results = train_model(stock_data)

if model_results is None:
    st.warning(
        "Select a longer date range to run the machine-learning model."
    )
else:
    (
        model_data,
        split_position,
        y_test,
        predicted_prices,
        error
    ) = model_results

    st.metric(
        "Mean Absolute Error",
        f"${error:,.2f}"
    )

    st.caption(
        "This value represents the model's average prediction error "
        "on the test portion of the historical data."
    )

    prediction_chart = go.Figure()

    prediction_chart.add_trace(
        go.Scatter(
            x=model_data["Date"].iloc[split_position:],
            y=y_test,
            mode="lines",
            name="Actual Price"
        )
    )

    prediction_chart.add_trace(
        go.Scatter(
            x=model_data["Date"].iloc[split_position:],
            y=predicted_prices,
            mode="lines",
            name="Predicted Price"
        )
    )

    prediction_chart.update_layout(
        xaxis_title="Date",
        yaxis_title="Closing Price ($)"
    )

    st.plotly_chart(
        prediction_chart,
        use_container_width=True
    )
