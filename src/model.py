import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error


def train_model(stock_data):
    model_data = stock_data[
        [
            "Date",
            "Close",
            "Volume",
            "20-Day Average",
            "50-Day Average"
        ]
    ].dropna().copy()

    if len(model_data) < 20:
        return None

    model_data["Day Number"] = np.arange(len(model_data))

    features = model_data[
        [
            "Day Number",
            "Volume",
            "20-Day Average",
            "50-Day Average"
        ]
    ]

    target = model_data["Close"]

    split_position = int(len(model_data) * 0.80)

    x_train = features.iloc[:split_position]
    x_test = features.iloc[split_position:]

    y_train = target.iloc[:split_position]
    y_test = target.iloc[split_position:]

    model = LinearRegression()

    model.fit(x_train, y_train)

    predicted_prices = model.predict(x_test)

    error = mean_absolute_error(
        y_test,
        predicted_prices
    )

    return (
        model_data,
        split_position,
        y_test,
        predicted_prices,
        error
    )