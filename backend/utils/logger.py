"""Logging utility for QuantPilot backend"""
import logging
import sys
from datetime import datetime
from typing import Any, Dict, Optional
from config import settings


class Logger:
    """Custom logger with structured logging support"""

    def __init__(self):
        self.logger = logging.getLogger("quantpilot")
        self.logger.setLevel(getattr(logging, settings.log_level.upper()))

        # Create console handler
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(getattr(logging, settings.log_level.upper()))

        # Create formatter
        formatter = logging.Formatter(
            "[%(asctime)s] [%(levelname)s] %(message)s",
            datefmt="%Y-%m-%dT%H:%M:%S"
        )
        handler.setFormatter(formatter)

        # Add handler to logger
        if not self.logger.handlers:
            self.logger.addHandler(handler)

    def _format_context(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Format context dictionary for logging"""
        if context and len(context) > 0:
            import json
            return f" {json.dumps(context)}"
        return ""

    def debug(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log debug message"""
        self.logger.debug(message + self._format_context(context))

    def info(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log info message"""
        self.logger.info(message + self._format_context(context))

    def warn(self, message: str, context: Optional[Dict[str, Any]] = None):
        """Log warning message"""
        self.logger.warning(message + self._format_context(context))

    def error(self, message: str, error: Optional[Exception] = None, context: Optional[Dict[str, Any]] = None):
        """Log error message"""
        error_msg = message + self._format_context(context)
        if error:
            self.logger.error(error_msg, exc_info=error)
        else:
            self.logger.error(error_msg)

    # API-specific logging helpers
    def api_request(self, method: str, url: str, params: Optional[Dict[str, Any]] = None):
        """Log API request"""
        self.info(f"API Request: {method} {url}", params)

    def api_response(self, method: str, url: str, status: int, duration: Optional[float] = None):
        """Log API response"""
        context = {"status": status}
        if duration:
            context["duration"] = duration
        self.info(f"API Response: {method} {url}", context)

    def api_error(self, method: str, url: str, error: Exception):
        """Log API error"""
        self.error(f"API Error: {method} {url}", error)

    # Feature-specific logging
    def stock_fetch(self, symbol: str, success: bool):
        """Log stock data fetch"""
        if success:
            self.debug("Stock data fetched", {"symbol": symbol})
        else:
            self.warn("Stock data fetch failed", {"symbol": symbol})

    def portfolio_action(self, action: str, symbol: Optional[str] = None):
        """Log portfolio action"""
        context = {"symbol": symbol} if symbol else None
        self.info(f"Portfolio {action}", context)

    def user_action(self, action: str, details: Optional[Dict[str, Any]] = None):
        """Log user action"""
        self.info(f"User action: {action}", details)


# Export singleton instance
logger = Logger()
