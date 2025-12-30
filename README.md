# 🚀 QuantPilot - AI-Powered Trading Platform

Professional AI-powered stock trading platform with ML predictions, technical analysis, and real-time insights.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black)
![Python](https://img.shields.io/badge/Python-3.9+-blue)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104-green)
![Supabase](https://img.shields.io/badge/Supabase-Auth-orange)

## ✨ Features

### 🤖 **AI & Machine Learning**
- ML price predictions (next day, week, month)
- AI chatbot powered by Groq LLM
- 40+ engineered features
- Ensemble ML models (Ridge, Lasso, Random Forest, Gradient Boosting)
- Backtesting with performance metrics

### 📊 **Technical Analysis**
- 14+ technical indicators (RSI, MACD, Bollinger Bands, Stochastic, ADX, Williams %R, CCI, VWAP)
- Real-time charting
- Trading signals
- Pattern recognition

### 💼 **Portfolio Management**
- Multi-portfolio support
- Real-time tracking
- Profit/loss calculations
- Portfolio recommendations
- Rebalancing suggestions
- Watchlist functionality

### 📰 **Market Intelligence**
- Real-time stock news from Finnhub
- Sentiment analysis
- Market updates
- Company fundamentals

### 🔐 **Authentication & Security**
- Supabase authentication
- Email/password & OAuth
- Row-level security (RLS)
- Persistent user portfolios
- Secure session management

## 🏗️ Architecture

```
Frontend (Next.js 16 + React + TypeScript)
    ↓ HTTPS/REST
Backend (Python FastAPI)
    ↓
┌─────────────┬─────────────┬──────────────┐
│   ML Models │  Stock Data │  External    │
│   - Ridge   │  - yfinance │  APIs        │
│   - Lasso   │  - Cache    │  - Groq AI   │
│   - RF/GBM  │  - Postgres │  - Finnhub   │
└─────────────┴─────────────┴──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.9+
- Supabase account (free)
- API keys: Groq, Finnhub

### 1. Clone Repository
```bash
git clone https://github.com/YOUR_USERNAME/QuantPilot.git
cd QuantPilot
```

### 2. Install Dependencies
```bash
# Frontend
npm install

# Backend
cd python-ml-service
pip install -r requirements.txt
```

### 3. Configure Environment

**`.env.local` (root directory):**
```bash
PYTHON_ML_SERVICE_URL=http://localhost:8000
GROQ_API_KEY=your_groq_key
FINNHUB_API_KEY=your_finnhub_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

**`python-ml-service/.env`:**
```bash
GROQ_API_KEY=your_groq_key
FINNHUB_API_KEY=your_finnhub_key
```

### 4. Set Up Supabase

1. Create project at https://supabase.com
2. Run migration: Copy `supabase/migrations/20250101000000_initial_schema.sql` to SQL Editor
3. Get API keys from Settings → API

### 5. Start Services

**Terminal 1 - Python Backend:**
```bash
cd python-ml-service
python app.py
# Running on http://localhost:8000
```

**Terminal 2 - Next.js Frontend:**
```bash
npm run dev
# Running on http://localhost:3000
```

### 6. Open App
Navigate to http://localhost:3000 and sign up!

## 📚 Documentation

- **[Deployment Guide](DEPLOYMENT_GUIDE.md)** - Deploy to Railway + Vercel
- **[Deployment Checklist](DEPLOYMENT_CHECKLIST.md)** - Pre-deployment checklist

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 16 (React 19)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI
- **Charts:** Recharts
- **State:** React Hooks

### Backend
- **Framework:** FastAPI
- **Language:** Python 3.9+
- **ML:** scikit-learn, statsmodels
- **Data:** pandas, numpy, yfinance
- **Cache:** In-memory with TTL

### Database & Auth
- **Database:** PostgreSQL (Supabase)
- **Authentication:** Supabase Auth
- **Storage:** Supabase Storage

### External APIs
- **AI:** Groq (llama-3.3-70b-versatile)
- **News:** Finnhub
- **Stock Data:** Yahoo Finance (yfinance)

## 📊 API Endpoints

### Stock Data
- `POST /quote` - Real-time quotes
- `POST /historical` - Historical OHLCV
- `POST /fundamentals` - Company fundamentals
- `POST /search` - Stock/ETF search

### Technical Analysis
- `POST /indicators` - Calculate indicators
- `POST /indicators/timeseries` - Time series data
- `POST /indicators/signals` - Trading signals

### ML & AI
- `POST /predict` - ML price predictions
- `POST /features` - Engineered features
- `POST /ai/chat` - AI assistant

### Portfolio
- `POST /recommendations` - Portfolio recommendations
- `POST /news` - Stock news with sentiment

## 🚀 Deployment

### Production Stack
- **Frontend:** Vercel (FREE)
- **Backend:** Railway ($5/month)
- **Database:** Supabase (FREE tier)
- **APIs:** Groq & Finnhub (FREE tiers)

**Total Cost:** ~$5/month

See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) for detailed instructions.

## 🔐 Security

- ✅ Row-level security (RLS) on all tables
- ✅ Secure password hashing
- ✅ HTTP-only cookies
- ✅ CORS configuration
- ✅ Environment variable protection
- ✅ API rate limiting

## 📈 Performance

- **Stock Quotes:** < 500ms
- **Technical Indicators:** < 1.5s
- **ML Predictions:** 2-5s (cached)
- **AI Chat:** 1-3s
- **News:** < 800ms (10min cache)

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

- **Issues:** [GitHub Issues](https://github.com/YOUR_USERNAME/QuantPilot/issues)
- **Discussions:** [GitHub Discussions](https://github.com/YOUR_USERNAME/QuantPilot/discussions)

## ⚠️ Disclaimer

This software is for educational purposes only. Not financial advice. Trade at your own risk.

## 🎯 Roadmap

- [ ] Real-time WebSocket updates
- [ ] Options analysis
- [ ] Cryptocurrency support
- [ ] Mobile app (React Native)
- [ ] Advanced charting (TradingView)
- [ ] Paper trading simulator
- [ ] Social features

## 🙏 Acknowledgments

- **Groq** - Fast LLM inference
- **Finnhub** - Market data & news
- **Supabase** - Database & auth
- **Vercel** - Frontend hosting
- **Railway** - Backend hosting

---

**Built with ❤️ for traders by traders**

Star ⭐ this repo if you find it useful!
