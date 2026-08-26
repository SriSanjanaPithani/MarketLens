def calculate_indicators(stock_data):
    stock_data["20-Day Average"] = (
        stock_data["Close"].rolling(window=20).mean()
    )

    stock_data["50-Day Average"] = (
        stock_data["Close"].rolling(window=50).mean()
    )

    price_difference = stock_data["Close"].diff()

    gains = price_difference.clip(lower=0)
    losses = -price_difference.clip(upper=0)

    average_gain = gains.rolling(window=14).mean()
    average_loss = losses.rolling(window=14).mean()

    relative_strength = average_gain / average_loss

    stock_data["RSI"] = (
        100 - (100 / (1 + relative_strength))
    )

    stock_data["12-Day EMA"] = (
        stock_data["Close"].ewm(span=12, adjust=False).mean()
    )

    stock_data["26-Day EMA"] = (
        stock_data["Close"].ewm(span=26, adjust=False).mean()
    )

    stock_data["MACD"] = (
        stock_data["12-Day EMA"] -
        stock_data["26-Day EMA"]
    )

    stock_data["Signal Line"] = (
        stock_data["MACD"].ewm(span=9, adjust=False).mean()
    )

    stock_data["MACD Histogram"] = (
        stock_data["MACD"] -
        stock_data["Signal Line"]
    )

    return stock_data