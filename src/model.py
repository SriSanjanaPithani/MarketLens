import numpy as np

from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error


def train_model(stock_data):
    # Keep only the columns needed for the model
    model_data = stock_data[
        [
            "Date",
            "Close",
            "Volume",
            "20-Day Average",
            "50-Day Average",
        ]
    ].dropna().copy()

    # Make sure there is enough data to train/test the model
    if len(model_data) < 20:
        return None

    # Numerical representation of time
    model_data["Day Number"] = np.arange(len(model_data))

    # Features used to predict closing price
    features = model_data[
        [
            "Day Number",
            "Volume",
            "20-Day Average",
            "50-Day Average",
        ]
    ]

    # Value we are trying to predict
    target = model_data["Close"]

    # Use first 80% for training and last 20% for testing
    split_position = int(len(model_data) * 0.80)

    x_train = features.iloc[:split_position]
    x_test = features.iloc[split_position:]

    y_train = target.iloc[:split_position]
    y_test = target.iloc[split_position:]

    # Train linear regression model
    model = LinearRegression()
    model.fit(x_train, y_train)

    # Predict closing prices for test data
    predicted_prices = model.predict(x_test)

    # Calculate model error
    error = mean_absolute_error(
        y_test,
        predicted_prices,
    )

    # Dates corresponding to the test data
    test_dates = model_data["Date"].iloc[split_position:]

    # Convert pandas/NumPy values into normal Python values
    # so FastAPI can return them as JSON
    predictions = []

    for date, actual, predicted in zip(
        test_dates,
        y_test,
        predicted_prices,
    ):
        predictions.append(
            {
                "Date": date.strftime("%Y-%m-%d"),
                "Actual": float(actual),
                "Predicted": float(predicted),
            }
        )

    return {
        "mean_absolute_error": float(error),
        "predictions": predictions,
        "training_size": int(len(x_train)),
        "testing_size": int(len(x_test)),
    }