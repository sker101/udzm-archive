# Quick Fix for Render Deployment Error

## The Problem
SQLite binaries compiled on Mac don't work on Render's Linux servers.

## The Solution
Switch to PostgreSQL (free on Render, better for production)

---

## Steps to Fix:

### 1. Create PostgreSQL Database on Render

1. Go to your Render Dashboard: https://dashboard.render.com
2. Click "**New +**" → "**PostgreSQL**"
3. Settings:
   - **Name**: `udzm-database`
   - **Database**: `udzm_archive`
   - **User**: (auto-generated)
   - **Region**: Same as your web service
   - **Instance Type**: **Free**
4. Click "**Create Database**"
5. Wait 1-2 minutes for it to be created

### 2. Connect Database to Your Web Service

1. Go to your **Web Service** (udzm-archive)
2. Click "**Environment**" tab
3. Click "**Add Environment Variable**"
4. Add:
   - **Key**: `DATABASE_URL`
   - **Value**: Click "**From Database**" → Select `udzm-database` → Select "**Internal Database URL**"
5. Click "**Save Changes**"

### 3. Redeploy

Your service will automatically redeploy with PostgreSQL!

---

## What Changed in Your Code:

✅ `database.js` - Now supports both SQLite (local) and PostgreSQL (production)
✅ `package.json` - Added PostgreSQL drivers (`pg`, `pg-hstore`)

---

## Testing Locally (Still Uses SQLite)

Your local development still uses SQLite - no changes needed!

```bash
cd /Users/macbookair/UDZM
cd server
node server.js
```

---

## After Deployment:

Your site will be live at: `https://udzm-archive.onrender.com`

The database will persist across deployments (unlike SQLite)!

---

**Estimated Time: 5 minutes**
