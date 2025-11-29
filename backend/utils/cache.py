"""Cache control headers utility"""
from typing import Dict


def cache_headers(max_age: int) -> Dict[str, str]:
    """
    Generate cache control headers for HTTP responses

    Args:
        max_age: Cache duration in seconds

    Returns:
        Dictionary with Cache-Control header
    """
    return {
        "Cache-Control": f"public, max-age={max_age}"
    }
