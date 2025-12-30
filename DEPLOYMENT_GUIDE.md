# 🚀 QuantPilot Deployment Guide

Complete guide to deploy QuantPilot to production using Railway (Python Backend) and Vercel (Next.js Frontend).

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Part 1: Deploy Python Backend to Railway](#part-1-deploy-python-backend-to-railway)
3. [Part 2: Deploy Next.js Frontend to Vercel](#part-2-deploy-nextjs-frontend-to-vercel)
4. [Part 3: Connect Frontend to Backend](#part-3-connect-frontend-to-backend)
5. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- ✅ GitHub account
- ✅ Railway account (sign up at https://railway.app)
- ✅ Vercel account (sign up at https://vercel.com)
- ✅ Groq API key (from https://console.groq.com/keys)
- ✅ Finnhub API key (from https://finnhub.io/register)
- ✅ Your code pushed to a GitHub repository

---

## Part 1: Deploy Python Backend to Railway

### Step 1: Push Your Code to GitHub

```bash
# Initialize git if you haven't already
git init

# Add all files
git add .

# Commit your changes
git commit -m "Ready for deployment"

# Create a new repository on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

### Step 2: Create New Railway Project

1. Go to https://railway.app
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your GitHub
5. Select your **QuantPilot** repository
6. Railway will detect it's a Python project

### Step 3: Configure Railway Service

1. **Set Root Directory:**
   - In your Railway project, click on the service
   - Go to **Settings** → **General**
   - Set **Root Directory** to: `python-ml-service`
   - Click **Save**

2. **Configure Start Command:**
   - Go to **Settings** → **Deploy**
   - Set **Start Command** to: `python app.py`
   - Click **Save**

### Step 4: Add Environment Variables

1. In your Railway service, go to **Variables** tab
2. Add the following environment variables:

```bash
GROQ_API_KEY=your_groq_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
PORT=8000
```

3. Click **Add** for each variable

### Step 5: Deploy

1. Railway will automatically deploy your service
2. Wait for the build to complete (2-5 minutes)
3. Once deployed, click **Settings** → **Networking**
4. Click **Generate Domain** to get a public URL
5. **Copy this URL** - you'll need it for Vercel (e.g., `https://your-app.railway.app`)

### Step 6: Verify Backend is Working

Test your Railway deployment:

```bash
# Replace YOUR_RAILWAY_URL with your actual Railway URL
curl https://YOUR_RAILWAY_URL.railway.app/health

# Expected response:
# {"status": "healthy", "cache_stats": {...}}
```

---

## Part 2: Deploy Next.js Frontend to Vercel

### Step 1: Prepare Vercel Configuration

Your repository is already configured! The `vercel.json` (if it exists) and `next.config.js` are ready.

### Step 2: Deploy to Vercel

1. Go to https://vercel.com
2. Click **"Add New"** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect it's a Next.js project

### Step 3: Configure Build Settings

Vercel should automatically detect:
- **Framework Preset:** Next.js
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

If not, set these manually.

### Step 4: Add Environment Variables

**CRITICAL:** Add these environment variables in Vercel:

1. In your Vercel project, go to **Settings** → **Environment Variables**
2. Add the following variables for **Production, Preview, and Development**:

```bash
PYTHON_ML_SERVICE_URL=https://YOUR_RAILWAY_URL.railway.app
GROQ_API_KEY=your_groq_api_key_here
FINNHUB_API_KEY=your_finnhub_api_key_here
```

**Replace `YOUR_RAILWAY_URL`** with your actual Railway URL from Part 1, Step 5.

### Step 5: Deploy

1. Click **"Deploy"**
2. Vercel will build and deploy your frontend (2-4 minutes)
3. Once complete, you'll get a production URL (e.g., `https://your-app.vercel.app`)

---

## Part 3: Connect Frontend to Backend

### Update CORS in Python Backend (Important!)

Your Railway backend needs to allow requests from your Vercel frontend.

1. Update `python-ml-service/app.py` CORS settings:

```python
# In app.py, update the CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Local development
        "https://your-app.vercel.app",  # Your Vercel URL
        "https://*.vercel.app",  # All Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

2. Commit and push:

```bash
git add python-ml-service/app.py
git commit -m "Update CORS for production"
git push
```

3. Railway will automatically redeploy

### Verify Everything Works

1. Open your Vercel URL: `https://your-app.vercel.app`
2. Test the following features:
   - ✅ Stock search
   - ✅ View stock news
   - ✅ AI chatbot
   - ✅ ML predictions
   - ✅ Portfolio recommendations

---

## 🎯 Environment Variables Summary

### Railway (Python Backend)
```bash
GROQ_API_KEY=gsk_...
FINNHUB_API_KEY=...
PORT=8000
```

### Vercel (Next.js Frontend)
```bash
PYTHON_ML_SERVICE_URL=https://your-app.railway.app
GROQ_API_KEY=gsk_...
FINNHUB_API_KEY=...
```

---

## 🔧 Troubleshooting

### Issue: "Connection refused" or "Failed to fetch"

**Solution:** Check that `PYTHON_ML_SERVICE_URL` in Vercel exactly matches your Railway URL.

```bash
# Vercel environment variable should be:
PYTHON_ML_SERVICE_URL=https://your-app.railway.app
# (no trailing slash!)
```

### Issue: "CORS error"

**Solution:** Update CORS settings in `python-ml-service/app.py` to include your Vercel domain.

### Issue: "API key not configured"

**Solution:** Verify environment variables are set in both Railway and Vercel:
- Go to Railway → Variables tab
- Go to Vercel → Settings → Environment Variables
- Make sure all keys are present

### Issue: Railway build fails

**Solution:** Check the Railway logs:
1. Click on your service in Railway
2. Go to **Deployments** tab
3. Click on the failed deployment
4. Review the build logs
5. Common fixes:
   - Ensure `requirements.txt` is in `python-ml-service/` directory
   - Ensure Root Directory is set to `python-ml-service`

### Issue: Vercel build fails

**Solution:**
1. Check build logs in Vercel dashboard
2. Ensure `package.json` has all dependencies
3. Try local build first: `npm run build`

### Issue: Python backend crashes or doesn't start

**Solution:**
1. Check Railway logs for errors
2. Verify all Python dependencies are in `requirements.txt`
3. Check that `PORT` environment variable is set
4. Ensure `python-dotenv` is in requirements.txt

---

## 🚀 Deployment Checklist

Before going live, verify:

- [ ] Python backend deployed to Railway
- [ ] Railway domain generated and accessible
- [ ] Frontend deployed to Vercel
- [ ] All environment variables set in both platforms
- [ ] CORS configured correctly
- [ ] Backend `/health` endpoint responds
- [ ] Frontend can connect to backend
- [ ] Stock search works
- [ ] News fetching works
- [ ] AI chat works
- [ ] ML predictions work

---

## 📊 Monitoring Your Deployment

### Railway Monitoring
- View logs: Railway Dashboard → Your Service → Logs
- Monitor metrics: Railway Dashboard → Metrics
- Check uptime: Railway automatically monitors

### Vercel Monitoring
- View deployment logs: Vercel Dashboard → Deployments
- Monitor analytics: Vercel Dashboard → Analytics
- Check function logs: Vercel Dashboard → Functions

---

## 💰 Cost Estimate

### Railway (Python Backend)
- **Hobby Plan:** $5/month + usage
- **Pay-as-you-go:** ~$10-20/month for moderate traffic
- Free $5 credit for new users

### Vercel (Next.js Frontend)
- **Hobby Plan:** FREE (up to 100GB bandwidth)
- **Pro Plan:** $20/month (unlimited bandwidth)
- Perfect for personal projects

**Total estimated cost:** ~$5-25/month depending on traffic

---

## 🔄 Continuous Deployment

Both Railway and Vercel support automatic deployments:

- **Every push to `main` branch** triggers automatic deployment
- **Preview deployments** for pull requests (Vercel)
- **Rollback** to previous deployments if needed

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [FastAPI Deployment](https://fastapi.tiangolo.com/deployment/)
- [Next.js Deployment](https://nextjs.org/docs/deployment)

---

## 🎉 Success!

Once deployed, your QuantPilot application will be:
- ✅ Accessible worldwide via HTTPS
- ✅ Automatically scaled based on traffic
- ✅ Continuously deployed on every push
- ✅ Production-ready and secure

Share your live URL and start trading! 📈

---

**Need help?** Check the troubleshooting section or review deployment logs in Railway/Vercel dashboards.
