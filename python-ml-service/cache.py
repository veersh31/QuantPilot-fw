"""
Simple in-memory cache with TTL support
"""

import time
from typing import Any, Optional, Dict
from datetime import datetime, timedelta


class SimpleCache:
    """Thread-safe in-memory cache with TTL"""

    def __init__(self):
        self._cache: Dict[str, Dict[str, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        """
        Get value from cache if it exists and hasn't expired

        Args:
            key: Cache key

        Returns:
            Cached value or None if not found/expired
        """
        if key not in self._cache:
            return None

        entry = self._cache[key]
        if time.time() > entry['expires_at']:
            # Expired, remove it
            del self._cache[key]
            return None

        print(f"[Cache] HIT: {key}")
        return entry['value']

    def set(self, key: str, value: Any, ttl: int = 300):
        """
        Set value in cache with TTL

        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default 5 minutes)
        """
        self._cache[key] = {
            'value': value,
            'expires_at': time.time() + ttl,
            'created_at': datetime.now().isoformat()
        }
        print(f"[Cache] SET: {key} (TTL: {ttl}s)")

    def delete(self, key: str):
        """Delete a specific key from cache"""
        if key in self._cache:
            del self._cache[key]
            print(f"[Cache] DELETE: {key}")

    def clear(self):
        """Clear all cache entries"""
        count = len(self._cache)
        self._cache.clear()
        print(f"[Cache] CLEARED: {count} entries removed")

    def cleanup_expired(self):
        """Remove all expired entries"""
        current_time = time.time()
        expired_keys = [
            key for key, entry in self._cache.items()
            if current_time > entry['expires_at']
        ]
        for key in expired_keys:
            del self._cache[key]

        if expired_keys:
            print(f"[Cache] CLEANUP: Removed {len(expired_keys)} expired entries")

    def stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            'total_entries': len(self._cache),
            'keys': list(self._cache.keys())
        }


# Global cache instance
cache = SimpleCache()
