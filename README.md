# QuantPilot - AI-Powered Portfolio Analytics Platform

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/c9shad0ww-gmailcoms-projects/v0-stock-analytics-chatbot)
[![Built with Next.js](https://img.shields.io/badge/Built%20with-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)

## 🚀 Overview

QuantPilot is a comprehensive, professional-grade portfolio analytics platform that combines real-time market data, advanced analytics, machine learning predictions, and AI-powered insights to help investors make informed decisions.

**Live Demo:** [https://vercel.com/c9shad0ww-gmailcoms-projects/v0-stock-analytics-chatbot](https://vercel.com/c9shad0ww-gmailcoms-projects/v0-stock-analytics-chatbot)

## ✨ Key Features

### 📊 Portfolio Management
- **Real-time Portfolio Tracking** - Track your holdings with live price updates (60-second refresh)
- **Performance Metrics** - Comprehensive analytics including total value, gains/losses, and returns
- **Transaction Manager** - Record and track all buy/sell transactions with detailed history
- **Paper Trading** - Practice trading strategies with virtual cash without risking real money
- **CSV Export** - Export your portfolio data for external analysis

### 💰 Dividend Tracking
- **Annual & Quarterly Projections** - Forecast your dividend income
- **Portfolio Dividend Yield** - Weighted average yield across all holdings
- **Income Distribution** - Visual breakdown of dividend income by stock
- **Monthly Income Calendar** - See projected monthly dividend payments
- **Dividend Stock Analysis** - Identify high-yield opportunities

### 🔄 Portfolio Rebalancing
- **Target Allocation Setting** - Define your ideal portfolio balance
- **Automatic Calculations** - Get exact buy/sell recommendations
- **Visual Comparison** - Side-by-side pie charts of current vs target allocations
- **Cash Injection Support** - Plan rebalancing with additional funds
- **Quick Distribution** - One-click even distribution across all holdings

### 🔍 Stock Screener
- **Advanced Filtering** - Screen stocks by:
  - Market Capitalization ($B)
  - P/E Ratio
  - Dividend Yield (%)
  - Price Range ($)
- **48 Popular Stocks** - Screens major stocks across all sectors
- **Quick Results** - Instant filtering with detailed stock cards
- **One-Click Add** - Add screened stocks directly to your portfolio

### 📈 Stock Comparison
- **Side-by-Side Analysis** - Compare up to 4 stocks simultaneously
- **Key Metrics Comparison** - Price, P/E, Market Cap, Dividend Yield, Volume, 52W High/Low
- **Relative Performance Chart** - 30-day percentage change visualization
- **Color-Coded Display** - Easy identification of each stock

### 🎯 Risk Analysis
- **Portfolio Correlation Matrix** - Understand how your stocks move together
  - Pearson correlation coefficients with color-coded heatmap
  - Diversification score (0-100)
  - Actionable recommendations for improving diversification
- **Risk Calculator** - Assess portfolio risk metrics
- **Volatility Analysis** - Measure and visualize portfolio volatility

### 🤖 Machine Learning Predictions
- **Price Predictions** - ML-powered 30-day price forecasts
- **Technical Indicators** - RSI, MACD, Bollinger Bands, Moving Averages
- **Buy/Hold/Sell Recommendations** - AI-driven trading signals
- **Confidence Scores** - Understand prediction reliability

### 💬 AI Trading Advisor
- **Natural Language Interface** - Ask questions in plain English
- **Portfolio Analysis** - Get insights about your holdings
- **Stock Research** - Research any stock with AI assistance
- **Strategy Recommendations** - Receive personalized trading strategies

### 📰 Market Intelligence
- **Real-Time News** - Latest news for any stock
- **Technical Analysis Charts** - Interactive price charts with indicators
- **Fundamental Analysis** - Deep dive into company financials
- **Watchlist** - Track your favorite stocks with live updates
- **Price Alerts** - Set custom price alerts (upcoming feature)

## 🛠️ Technology Stack

### Frontend
- **Next.js 16** - React framework with App Router and Turbopack
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **shadcn/ui** - High-quality React components
- **Recharts** - Beautiful, composable charts
- **Sonner** - Toast notifications

### Backend
- **Next.js API Routes** - Serverless API endpoints
- **Python Flask** - ML prediction service
- **Yahoo Finance API** - Real-time market data
- **TensorFlow/Scikit-learn** - Machine learning models

### Storage
- **LocalStorage** - Client-side data persistence
- **Context API** - Global state management

## 📦 Installation

### Prerequisites
- Node.js 18+
- Python 3.8+
- npm or yarn

### Setup

1. **Clone the repository**
```bash
git clone <repository-url>
cd QuantPilot-fw
```

2. **Install Node.js dependencies**
```bash
npm install --legacy-peer-deps
```

3. **Install Python dependencies**
```bash
cd ml-service
pip install -r requirements.txt
cd ..
```

4. **Set up environment variables**
Create a `.env.local` file in the root directory:
```env
# Add any API keys here if needed
```

5. **Start the development servers**

In one terminal, start the Next.js dev server:
```bash
npm run dev
```

In another terminal, start the Python ML service:
```bash
cd ml-service
python app.py
```

6. **Open the application**
Navigate to `http://localhost:3000` in your browser.

## 📱 User Interface

### Main Tabs
1. **Overview** - Stock search and quick add to portfolio
2. **Screener** - Advanced stock screening with multiple filters
3. **Portfolio** - Holdings, performance, dividends, and rebalancing
4. **Analysis** - Charts, metrics, comparison, risk tools, and news
5. **ML Predictions** - Machine learning price forecasts
6. **Account** - Paper trading, transactions, and tax reports

### Portfolio Sub-Tabs
- **Holdings** - View and manage your stock positions
- **Performance** - Track portfolio performance over time
- **Dividends** - Monitor dividend income and projections
- **Rebalancing** - Calculate optimal portfolio allocations

### Analysis Sub-Tabs
- **Charts** - Interactive price charts with technical indicators
- **Metrics** - In-depth fundamental analysis
- **Compare** - Side-by-side stock comparison
- **Risk Tools** - Risk calculator and correlation matrix
- **News** - Latest market news and updates

## 🔧 Configuration

### Polling Intervals
All real-time data updates every 60 seconds to optimize API usage while maintaining freshness.

### Data Sources
- **Stock Quotes** - Yahoo Finance API
- **Historical Data** - Yahoo Finance historical charts
- **News** - Yahoo Finance news feed
- **ML Predictions** - Custom TensorFlow/Scikit-learn models

## 🎨 Features in Detail

### Stock Screener
Filter stocks across multiple criteria simultaneously:
- **Market Cap**: $0B - $10,000B range
- **P/E Ratio**: 0 - 100 range
- **Dividend Yield**: 0% - 10% range
- **Price**: $0 - $1,000 range

### Correlation Matrix
Understand portfolio diversification:
- **Strong Positive (0.7-1.0)**: Red - Stocks move together (higher risk)
- **Moderate Positive (0.4-0.7)**: Orange - Some similar movement
- **Weak Positive (0.1-0.4)**: Yellow - Loosely related
- **No Correlation (-0.1-0.1)**: Gray - Independent movement
- **Weak Negative (-0.4--0.1)**: Blue - Somewhat opposite
- **Strong Negative (-1.0--0.4)**: Green - Move opposite (good for diversification)

### Rebalancing Calculator
Optimize your portfolio allocation:
1. Set target percentages for each holding
2. Input additional cash to invest (optional)
3. Calculate exact shares to buy/sell
4. View current vs target allocation comparison
5. Execute rebalancing plan

## 🚀 Performance Optimizations

- **60-second polling** instead of 5-second (92% reduction in API calls)
- **Error boundaries** for graceful error handling
- **Toast notifications** for user feedback
- **Loading states** throughout the application
- **Responsive design** for all screen sizes
- **Type-safe development** with TypeScript

## 📊 Data Privacy

- All portfolio data is stored locally in your browser
- No data is sent to external servers except for:
  - Stock quotes from Yahoo Finance
  - ML predictions from local Python service
  - AI chat interactions (if enabled)

## 🤝 Contributing

This is a personal project, but suggestions and feedback are welcome!

## 📄 License

This project is for educational and personal use.

## ⚠️ Disclaimer

QuantPilot is for informational purposes only and should not be considered financial advice. Always do your own research and consult with a qualified financial advisor before making investment decisions.

- Past performance does not guarantee future results
- Stock prices and predictions are estimates only
- Machine learning predictions should be used as one of many tools in your decision-making process
- The developers are not responsible for any financial losses

## 🛣️ Roadmap

### Completed ✅
- [x] Real-time portfolio tracking
- [x] Stock comparison tool
- [x] Dividend tracking and projections
- [x] Portfolio correlation matrix
- [x] Stock screener with advanced filters
- [x] Portfolio rebalancing calculator
- [x] ML price predictions
- [x] AI trading advisor
- [x] Paper trading mode
- [x] Transaction management
- [x] Tax reporting

### Upcoming Features
- [ ] Price alerts with notifications
- [ ] Sector allocation analysis
- [ ] Options trading analytics
- [ ] Backtesting strategies
- [ ] Multi-currency support
- [ ] Mobile app (React Native)
- [ ] Social trading features
- [ ] Portfolio templates

## 📞 Support

For issues, questions, or feature requests, please open an issue on GitHub.

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Charts powered by [Recharts](https://recharts.org/)
- Data from [Yahoo Finance](https://finance.yahoo.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Made with ❤️ for retail investors**
