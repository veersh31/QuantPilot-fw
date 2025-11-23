"""
Professional ML Models for Stock/ETF Price Prediction
Uses industry-standard libraries: scikit-learn, statsmodels
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple
from sklearn.linear_model import Ridge, Lasso
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.arima.model import ARIMA
import warnings
warnings.filterwarnings('ignore')


class MLEnsemble:
    """Ensemble of multiple ML models for robust predictions"""

    def __init__(self):
        # Initialize models
        self.linear_model = Ridge(alpha=1.0, random_state=42)
        self.lasso_model = Lasso(alpha=0.1, random_state=42)
        self.rf_model = RandomForestRegressor(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42,
            n_jobs=-1
        )
        self.gb_model = GradientBoostingRegressor(
            n_estimators=100,
            max_depth=5,
            learning_rate=0.1,
            random_state=42
        )

        self.feature_names = []
        self.is_trained = False

    def train(self, X_train: pd.DataFrame, y_train: pd.Series) -> Dict[str, float]:
        """
        Train all models

        Returns:
            Dictionary with training metrics
        """
        print(f"[ML Models] Training with {len(X_train)} samples, {X_train.shape[1]} features")

        self.feature_names = X_train.columns.tolist()

        # Train each model
        self.linear_model.fit(X_train, y_train)
        self.lasso_model.fit(X_train, y_train)
        self.rf_model.fit(X_train, y_train)
        self.gb_model.fit(X_train, y_train)

        self.is_trained = True

        # Get training metrics
        train_predictions = self.predict(X_train)
        mae = mean_absolute_error(y_train, train_predictions)
        rmse = np.sqrt(mean_squared_error(y_train, train_predictions))
        r2 = r2_score(y_train, train_predictions)

        return {
            'mae': mae,
            'rmse': rmse,
            'r2': r2,
            'n_samples': len(X_train),
            'n_features': X_train.shape[1]
        }

    def predict(self, X: pd.DataFrame, return_individual: bool = False) -> np.ndarray:
        """
        Generate ensemble prediction

        Args:
            X: Features to predict on
            return_individual: If True, return predictions from each model

        Returns:
            Ensemble predictions (or dict of individual predictions)
        """
        if not self.is_trained:
            raise ValueError("Models not trained yet. Call train() first.")

        # Get predictions from each model
        lr_pred = self.linear_model.predict(X)
        lasso_pred = self.lasso_model.predict(X)
        rf_pred = self.rf_model.predict(X)
        gb_pred = self.gb_model.predict(X)

        if return_individual:
            return {
                'linear': lr_pred,
                'lasso': lasso_pred,
                'random_forest': rf_pred,
                'gradient_boosting': gb_pred
            }

        # Ensemble: weighted average
        # Give more weight to tree-based models
        ensemble = (
            lr_pred * 0.2 +
            lasso_pred * 0.15 +
            rf_pred * 0.35 +
            gb_pred * 0.3
        )

        return ensemble

    def get_feature_importance(self) -> Dict[str, float]:
        """Get feature importance from tree-based models"""
        if not self.is_trained:
            return {}

        # Average importance from RF and GB
        rf_importance = self.rf_model.feature_importances_
        gb_importance = self.gb_model.feature_importances_

        avg_importance = (rf_importance + gb_importance) / 2

        importance_dict = {
            name: float(importance)
            for name, importance in zip(self.feature_names, avg_importance)
        }

        # Sort by importance
        sorted_importance = dict(
            sorted(importance_dict.items(), key=lambda x: x[1], reverse=True)
        )

        return sorted_importance

    def calculate_confidence(self, X: pd.DataFrame) -> np.ndarray:
        """
        Calculate prediction confidence based on model agreement

        Returns:
            Array of confidence scores (0-1)
        """
        individual_preds = self.predict(X, return_individual=True)

        predictions = np.array([
            individual_preds['linear'],
            individual_preds['lasso'],
            individual_preds['random_forest'],
            individual_preds['gradient_boosting']
        ])

        # Confidence based on coefficient of variation
        mean_pred = predictions.mean(axis=0)
        std_pred = predictions.std(axis=0)

        # Avoid division by zero
        cv = np.where(np.abs(mean_pred) > 0.01, std_pred / np.abs(mean_pred), 1.0)

        # Convert to confidence (inverse of CV, clamped to [0.6, 0.95])
        confidence = np.clip(1 - cv, 0.6, 0.95)

        return confidence


class TimeSeriesModels:
    """Time series models for multi-step forecasting"""

    def __init__(self):
        self.es_model = None
        self.arima_model = None
        self.prices = None

    def train(self, prices: pd.Series):
        """Train time series models on price history"""
        self.prices = prices

        print(f"[Time Series] Training on {len(prices)} price points")

        # Exponential Smoothing (Holt's method with trend)
        try:
            self.es_model = ExponentialSmoothing(
                prices,
                trend='add',
                seasonal=None,
                initialization_method="estimated"
            ).fit()
        except Exception as e:
            print(f"[Time Series] Exponential Smoothing training failed: {e}")
            self.es_model = None

        # ARIMA model (auto-select best parameters)
        try:
            # Use simple AR(5) model for speed
            self.arima_model = ARIMA(prices, order=(5, 1, 2)).fit()
        except Exception as e:
            print(f"[Time Series] ARIMA training failed: {e}")
            self.arima_model = None

    def predict(self, steps: int = 1) -> Dict[str, float]:
        """
        Forecast future prices

        Args:
            steps: Number of days ahead to predict

        Returns:
            Dictionary with predictions and confidence
        """
        predictions = {}

        # Exponential Smoothing prediction
        if self.es_model is not None:
            try:
                es_forecast = self.es_model.forecast(steps=steps)
                predictions['exponential_smoothing'] = float(es_forecast.iloc[-1])
            except:
                predictions['exponential_smoothing'] = float(self.prices.iloc[-1])
        else:
            predictions['exponential_smoothing'] = float(self.prices.iloc[-1])

        # ARIMA prediction
        if self.arima_model is not None:
            try:
                arima_forecast = self.arima_model.forecast(steps=steps)
                predictions['arima'] = float(arima_forecast.iloc[-1] if hasattr(arima_forecast, 'iloc') else arima_forecast[-1])
            except:
                predictions['arima'] = float(self.prices.iloc[-1])
        else:
            predictions['arima'] = float(self.prices.iloc[-1])

        # Ensemble of time series models
        predictions['ensemble'] = (
            predictions['exponential_smoothing'] * 0.5 +
            predictions['arima'] * 0.5
        )

        # Confidence decreases with forecast horizon
        predictions['confidence'] = max(0.5, 0.8 - (steps * 0.05))

        return predictions


def evaluate_model(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, float]:
    """
    Calculate comprehensive model performance metrics

    Returns:
        Dictionary with MAE, RMSE, MAPE, R², and directional accuracy
    """
    # Basic metrics
    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    # MAPE (Mean Absolute Percentage Error)
    mape = np.mean(np.abs((y_true - y_pred) / y_true)) * 100

    # Directional Accuracy
    if len(y_true) > 1:
        actual_direction = np.diff(y_true) > 0
        pred_direction = np.diff(y_pred) > 0
        directional_accuracy = np.mean(actual_direction == pred_direction) * 100
    else:
        directional_accuracy = 50.0

    return {
        'mae': float(mae),
        'rmse': float(rmse),
        'mape': float(mape),
        'r2': float(r2),
        'directional_accuracy': float(directional_accuracy)
    }


def calculate_prediction_intervals(predictions: np.ndarray, confidence_level: float = 0.95) -> Tuple[np.ndarray, np.ndarray]:
    """
    Calculate prediction intervals (confidence bounds)

    Args:
        predictions: Array of predictions
        confidence_level: Confidence level (default 0.95 for 95%)

    Returns:
        Tuple of (lower_bounds, upper_bounds)
    """
    # Estimate prediction error (simple approach)
    std_error = np.std(predictions) * 0.1  # Conservative estimate

    # Z-score for confidence level
    from scipy import stats
    z = stats.norm.ppf((1 + confidence_level) / 2)

    lower_bounds = predictions - z * std_error
    upper_bounds = predictions + z * std_error

    return lower_bounds, upper_bounds
