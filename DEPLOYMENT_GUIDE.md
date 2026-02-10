# UDZM Archive - Deployment Guide

## Step-by-Step Deployment to Render.com

### Prerequisites
✓ Your code is already committed to Git
✓ You have a GitHub account

---

## Part 1: Push to GitHub (5 minutes)

### 1. Create a new repository on GitHub
1. Go to https://github.com/new
2. Repository name: `udzm-archive`
3. Description: "UDSM History of Books & Journalism Archive"
4. Keep it **Public** (required for Render free tier)
5. **DO NOT** initialize with README (you already have code)
6. Click "Create repository"

### 2. Push your code to GitHub
```bash
cd /Users/macbookair/UDZM

# Add GitHub as remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/udzm-archive.git

# Push your code
git branch -M main
git push -u origin main
```

---

## Part 2: Deploy on Render.com (10 minutes)

### 1. Sign up for Render
1. Go to https://render.com
2. Click "Get Started for Free"
3. Sign up with your **GitHub account** (easiest option)
4. Authorize Render to access your GitHub repositories

### 2. Create a new Web Service
1. Click "New +" button (top right)
2. Select "Web Service"
3. Connect your `udzm-archive` repository
4. Click "Connect"

### 3. Configure the service
Fill in these settings:

**Basic Settings:**
- **Name**: `udzm-archive` (or any name you prefer)
- **Region**: Choose closest to Tanzania (e.g., Frankfurt or Singapore)
- **Branch**: `main`
- **Root Directory**: Leave empty
- **Runtime**: `Node`

**Build & Deploy:**
- **Build Command**: `cd server && npm install`
- **Start Command**: `cd server && node server.js`

**Instance Type:**
- Select **Free** tier

### 4. Add Environment Variables (Optional)
Click "Advanced" → "Add Environment Variable":
- Key: `NODE_ENV`, Value: `production`

### 5. Deploy!
1. Click "Create Web Service"
2. Wait 3-5 minutes for deployment
3. Your site will be live at: `https://udzm-archive.onrender.com`

---

## Part 3: Test Your Deployment

### What to check:
1. ✓ Homepage loads correctly
2. ✓ Can browse books in the repository
3. ✓ Can upload a new book (PDF upload)
4. ✓ Can view book details
5. ✓ Map shows reader locations
6. ✓ Admin dashboard displays statistics

### Known Issues on Free Tier:
- **Cold starts**: First visit after 15 min inactivity takes ~30 seconds to load
- **File uploads**: Uploaded PDFs will be lost on redeployment (use external storage for production)

---

## Part 4: Share with Others

Your website URL will be:
```
https://udzm-archive.onrender.com
```

Share this link to:
- ✓ Collect feedback from users
- ✓ Allow contributors to upload books
- ✓ Track global readership on the map

---

## Updating Your Site

Whenever you make changes:
```bash
git add .
git commit -m "Description of changes"
git push
```

Render will **automatically redeploy** within 2-3 minutes!

---

## Troubleshooting

### Site not loading?
- Check Render dashboard for deployment logs
- Look for errors in the "Logs" tab

### Database resets on deployment?
- This is normal with SQLite on free tier
- For persistent data, upgrade to PostgreSQL (still free on Render)

### Need help?
- Render docs: https://render.com/docs
- Check deployment logs in Render dashboard

---

## Next Steps (Optional)

### Custom Domain (Free)
1. Buy a domain from Namecheap (~$10/year)
2. Add custom domain in Render settings
3. Update DNS records

### Persistent Database
1. Create PostgreSQL database on Render (free)
2. Update `server/database.js` to use PostgreSQL
3. Redeploy

### File Storage
1. Use Cloudinary (free tier) for PDF storage
2. Update upload logic to use Cloudinary API

---

**Estimated Total Time: 15-20 minutes**

Good luck with your deployment! 🚀
