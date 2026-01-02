/**
 * Shared Yahoo Finance client
 * Singleton instance to avoid rate limiting and share authentication
 */

import YahooFinance from 'yahoo-finance2'

// Create a singleton instance
const yahooFinance = new YahooFinance()

export default yahooFinance
