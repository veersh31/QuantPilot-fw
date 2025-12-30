# 🚀 Quick Deployment Checklist

## Before Deployment

- [ ] All code committed to GitHub
- [ ] `.env` files are in `.gitignore` (DO NOT commit API keys!)
- [ ] Test locally: Backend running on port 8000, Frontend on port 3000
- [ ] All features working locally

## Railway (Python Backend)

- [ ] Create Railway account at https://railway.app
- [ ] Create new project from GitHub repo
- [ ] Set root directory to `python-ml-service`
- [ ] Add environment variables:
  - [ ] `GROQ_API_KEY`
  - [ ] `FINNHUB_API_KEY`
  - [ ] `PORT=8000`
- [ ] Generate public domain
- [ ] Test health endpoint: `https://YOUR_URL.railway.app/health`
- [ ] Copy Railway URL for Vercel setup

## Vercel (Next.js Frontend)

- [ ] Create Vercel account at https://vercel.com
- [ ] Import GitHub repository
- [ ] Add environment variables:
  - [ ] `PYTHON_ML_SERVICE_URL=https://YOUR_RAILWAY_URL.railway.app`
  - [ ] `GROQ_API_KEY`
  - [ ] `FINNHUB_API_KEY`
- [ ] Deploy
- [ ] Test frontend at your Vercel URL

## Post-Deployment

- [ ] Update CORS in `python-ml-service/app.py` to include Vercel domain
- [ ] Push CORS update to trigger Railway redeploy
- [ ] Test all features:
  - [ ] Stock search
  - [ ] News fetching
  - [ ] AI chatbot
  - [ ] ML predictions
  - [ ] Portfolio management
  - [ ] Technical indicators

## Your Deployment URLs

**Backend (Railway):** `_______________________`

**Frontend (Vercel):** `_______________________`

---

## Quick Deploy Commands

```bash
# 1. Commit and push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 2. Deploy happens automatically on Railway and Vercel!

# 3. Test backend
curl https://YOUR_RAILWAY_URL.railway.app/health

# 4. Open frontend
open https://YOUR_VERCEL_URL.vercel.app
```

## Need Help?

See full instructions in `DEPLOYMENT_GUIDE.md`
