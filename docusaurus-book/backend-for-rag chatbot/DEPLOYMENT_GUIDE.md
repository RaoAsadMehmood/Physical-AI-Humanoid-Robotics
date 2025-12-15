# Backend Deployment Guide

Aap apne backend ko multiple platforms pe deploy kar sakte hain. Yahan best options hain:

## Option 1: Railway (Recommended - Easiest) 🚂

Railway Python apps ke liye bahut easy hai aur free tier bhi milta hai.

### Steps:

1. **Railway account banayein:**
   - https://railway.app pe jayein
   - GitHub se sign in karein

2. **New Project create karein:**
   - "New Project" click karein
   - "Deploy from GitHub repo" choose karein
   - Apna repo select karein

3. **Service add karein:**
   - "New" → "GitHub Repo" select karein
   - `rag-backend` folder select karein (ya phir root se deploy karein)

4. **Environment Variables add karein:**
   Railway dashboard mein "Variables" tab mein ye add karein:
   ```
   OPENAI_API_KEY=your_key_here
   COHERE_API_KEY=your_key_here
   QDRANT_URL=your_url_here
   QDRANT_API_KEY=your_key_here
   EMBED_MODEL=embed-english-v3.0
   COLLECTION_NAME=physical_ai_book
   ```

5. **Settings configure karein:**
   - Root Directory: `rag-backend`
   - Build Command: `pip install -r requirements.txt` (ya `uv sync`)
   - Start Command: `uvicorn api_server:app --host 0.0.0.0 --port $PORT`

6. **Deploy:**
   - Railway automatically deploy kar dega
   - URL mil jayega: `https://your-app-name.up.railway.app`

---

## Option 2: Render (Free Tier Available) 🎨

Render bhi free tier deta hai Python apps ke liye.

### Steps:

1. **Render account:**
   - https://render.com pe jayein
   - Sign up karein

2. **New Web Service:**
   - "New +" → "Web Service"
   - GitHub repo connect karein
   - Settings:
     - **Name:** rag-backend (ya kuch bhi)
     - **Root Directory:** rag-backend
     - **Environment:** Python 3
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `uvicorn api_server:app --host 0.0.0.0 --port $PORT`

3. **Environment Variables:**
   Render dashboard mein "Environment" section mein add karein:
   ```
   OPENAI_API_KEY
   COHERE_API_KEY
   QDRANT_URL
   QDRANT_API_KEY
   EMBED_MODEL
   COLLECTION_NAME
   ```

4. **Deploy:**
   - "Create Web Service" click karein
   - URL: `https://your-app-name.onrender.com`

**Note:** Free tier pe app sleep ho sakta hai after inactivity. Paid plan lena padega for 24/7 uptime.

---

## Option 3: Fly.io (Good Performance) ✈️

Fly.io fast hai aur free tier bhi deta hai.

### Steps:

1. **Install Fly CLI:**
   ```bash
   # Windows (PowerShell)
   iwr https://fly.io/install.ps1 -useb | iex
   ```

2. **Login:**
   ```bash
   fly auth login
   ```

3. **Create fly.toml:**
   ```bash
   cd rag-backend
   fly launch
   ```
   - App name choose karein
   - Region select karein
   - PostgreSQL skip karein (not needed)

4. **Environment Variables:**
   ```bash
   fly secrets set OPENAI_API_KEY=your_key
   fly secrets set COHERE_API_KEY=your_key
   fly secrets set QDRANT_URL=your_url
   fly secrets set QDRANT_API_KEY=your_key
   fly secrets set EMBED_MODEL=embed-english-v3.0
   fly secrets set COLLECTION_NAME=physical_ai_book
   ```

5. **Deploy:**
   ```bash
   fly deploy
   ```

---

## Option 4: Vercel Serverless Functions (Advanced)

Vercel pe Python backend deploy kar sakte hain using serverless functions, but thoda setup chahiye.

### Steps:

1. **api/ folder create karein** (docusaurus-book root mein):
   ```
   docusaurus-book/
   ├── api/
   │   └── chat.py
   ```

2. **vercel.json create karein:**
   ```json
   {
     "functions": {
       "api/chat.py": {
         "runtime": "python3.9"
       }
     },
     "rewrites": [
       { "source": "/api/chat", "destination": "/api/chat.py" }
     ]
   }
   ```

3. **Dependencies:**
   Vercel automatically detect karega, but better hai separate backend service use karein.

**Recommendation:** Railway ya Render use karein - zyada easy hai!

---

## Frontend Update (Important!)

Backend deploy hone ke baad, frontend mein API URL update karein:

### `src/components/Chatbot/ChatbotWidget.jsx` mein:

```javascript
const API_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-railway-app.up.railway.app'  // Yahan apna backend URL
  : 'http://localhost:8000';
```

Ya phir environment variable use karein:

1. **Vercel Dashboard mein:**
   - Project → Settings → Environment Variables
   - Add: `NEXT_PUBLIC_API_URL` = `https://your-backend-url.com`

2. **Code mein:**
   ```javascript
   const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
   ```

---

## Quick Start (Railway - Recommended)

1. Railway.app pe jao
2. GitHub se login karo
3. New Project → GitHub Repo select karo
4. `rag-backend` folder select karo
5. Environment variables add karo
6. Deploy!

URL mil jayega: `https://your-app.up.railway.app`

---

## Testing

Deploy ke baad test karein:

```bash
curl -X POST https://your-backend-url.com/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "What is Physical AI?"}'
```

---

## Troubleshooting

### CORS Error:
`api_server.py` mein CORS settings check karein:
```python
allow_origins=["*"]  # Production mein specific domain use karein
```

### Environment Variables:
Deployment platform pe sab variables properly set hone chahiye.

### Port Issues:
Platform automatically `$PORT` set karta hai, code mein use karein.

---

**Best Choice:** Railway - Easiest aur reliable! 🚂
