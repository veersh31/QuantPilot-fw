import { HelpCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

interface TooltipHelpProps {
  content: string
  title?: string
}

export function TooltipHelp({ content, title }: TooltipHelpProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle size={14} className="ml-1" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs p-3">
          {title && <p className="font-semibold mb-1">{title}</p>}
          <p className="text-sm">{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Predefined financial metric tooltips
export const FinancialTooltips = {
  pe: {
    title: "P/E Ratio",
    content: "Price-to-Earnings ratio. Shows how much investors are willing to pay per dollar of earnings. Lower P/E may indicate undervaluation, higher P/E suggests growth expectations."
  },
  marketCap: {
    title: "Market Capitalization",
    content: "Total value of all company shares. Calculated as share price × total shares outstanding. Indicates company size: <$2B (small), $2-10B (mid), >$10B (large)."
  },
  dividendYield: {
    title: "Dividend Yield",
    content: "Annual dividend payment as a percentage of stock price. Higher yield means more income for investors, but very high yields may signal risk."
  },
  volume: {
    title: "Trading Volume",
    content: "Number of shares traded today. High volume indicates strong interest and liquidity. Low volume may mean difficulty buying/selling."
  },
  fiftyTwoWeekHigh: {
    title: "52-Week High",
    content: "Highest price in the past year. Stocks near their high may have momentum, but could also be overbought."
  },
  fiftyTwoWeekLow: {
    title: "52-Week Low",
    content: "Lowest price in the past year. Stocks near their low might be undervalued opportunities or facing fundamental issues."
  },
  rsi: {
    title: "RSI (Relative Strength Index)",
    content: "Momentum indicator from 0-100. Above 70 = overbought (may drop), below 30 = oversold (may rise). Helps identify trend reversals."
  },
  macd: {
    title: "MACD (Moving Average Convergence Divergence)",
    content: "Trend-following indicator. When MACD line crosses above signal line, it's bullish. Below signal line is bearish. Measures momentum."
  },
  bollingerBands: {
    title: "Bollinger Bands",
    content: "Volatility bands around price. Prices near upper band may be overbought, near lower band oversold. Band width shows volatility."
  },
  sma: {
    title: "Simple Moving Average (SMA)",
    content: "Average price over specified period. Price above SMA is bullish, below is bearish. SMA50 and SMA200 are key support/resistance levels."
  },
  beta: {
    title: "Beta",
    content: "Measures stock volatility vs market. Beta=1 moves with market, >1 more volatile, <1 less volatile. Negative beta moves opposite to market."
  },
  eps: {
    title: "Earnings Per Share (EPS)",
    content: "Company's profit divided by shares outstanding. Higher EPS means more profitability. Growth in EPS is positive signal."
  },
  revenue: {
    title: "Revenue",
    content: "Total money earned from sales before expenses. Consistent revenue growth indicates healthy business expansion."
  },
  netIncome: {
    title: "Net Income",
    content: "Profit after all expenses, taxes, and costs. The bottom line of profitability. Positive and growing is best."
  }
}
