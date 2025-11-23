import { calculateTechnicalAnalysis, PriceData } from '@/lib/technical-indicators'
import YahooFinance from 'yahoo-finance2'

const yahooFinance = new YahooFinance()

export async function POST(request: Request) {
  try {
    const { symbol, days = 200 } = await request.json()

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Technical Indicators] Calculating indicators for:', symbol)

    // Fetch historical data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const historicalData = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }, { validateResult: false })

    if (!historicalData || historicalData.length === 0) {
      return Response.json({ error: 'No historical data available' }, { status: 404 })
    }

    // Convert to PriceData format
    const priceData: PriceData[] = historicalData.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume || 0,
    }))

    // Calculate all technical indicators
    const analysis = calculateTechnicalAnalysis(priceData)

    console.log('[Technical Indicators] Analysis complete for:', symbol, 'Overall signal:', analysis.overallSignal)

    return Response.json({
      symbol: symbol.toUpperCase(),
      analysis,
      dataPoints: priceData.length,
      currentPrice: priceData[priceData.length - 1].close
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('[Technical Indicators] Error:', error)
    return Response.json({ error: 'Failed to calculate indicators' }, { status: 500 })
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const days = parseInt(searchParams.get('days') || '200')

    if (!symbol) {
      return Response.json({ error: 'Symbol required' }, { status: 400 })
    }

    console.log('[Technical Indicators] Calculating indicators for:', symbol)

    // Fetch historical data
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)

    const historicalData = await yahooFinance.historical(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }, { validateResult: false })

    if (!historicalData || historicalData.length === 0) {
      return Response.json({ error: 'No historical data available' }, { status: 404 })
    }

    // Convert to PriceData format
    const priceData: PriceData[] = historicalData.map(item => ({
      date: item.date.toISOString().split('T')[0],
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume || 0,
    }))

    // Calculate all technical indicators
    const analysis = calculateTechnicalAnalysis(priceData)

    console.log('[Technical Indicators] Analysis complete for:', symbol, 'Overall signal:', analysis.overallSignal)

    return Response.json({
      symbol: symbol.toUpperCase(),
      analysis,
      dataPoints: priceData.length,
      currentPrice: priceData[priceData.length - 1].close
    }, {
      headers: {
        'Cache-Control': 'public, max-age=300', // Cache for 5 minutes
      },
    })
  } catch (error) {
    console.error('[Technical Indicators] Error:', error)
    return Response.json({ error: 'Failed to calculate indicators' }, { status: 500 })
  }
}
