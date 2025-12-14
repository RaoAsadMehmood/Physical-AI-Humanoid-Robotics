# Quick Deployment Steps 🚀

## Backend Deploy (Railway - Easiest)

### Step 1: Railway Setup
1. https://railway.app pe jao
2. "Start a New Project" click karo
3. "Deploy from GitHub repo" choose karo
4. Apna repo select karo

### Step 2: Service Configuration
1. "New" → "GitHub Repo" select karo
2. **Root Directory:** `rag-backend` set karo
3. Railway automatically detect kar lega

### Step 3: Environment Variables
Railway dashboard → "Variables" tab mein ye add karo:

```
OPENAI_API_KEY=your_openai_key
COHERE_API_KEY=your_cohere_key
QDRANT_URL=your_qdrant_url
QDRANT_API_KEY=your_qdrant_key
EMBED_MODEL=embed-english-v3.0
COLLECTION_NAME=physical_ai_book
ALLOWED_ORIGINS=https://physical-ai-humanoid-robotics-beige.vercel.app
```

### Step 4: Deploy Settings
Railway automatically detect kar lega, but agar manually set karna ho:

- **Build Command:** `pip install -r requirements.txt`
- **Start Command:** `uvicorn api_server:app --host 0.0.0.0 --port $PORT`

### Step 5: Get Your Backend URL
Deploy hone ke baad Railway URL dega:
```
https://your-app-name.up.railway.app
```

Copy karlo ye URL!

---

## Frontend Update (Vercel)

### Step 1: Vercel Environment Variables
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add new variable:
   - **Name:** `REACT_APP_API_URL`
   - **Value:** `https://your-app-name.up.railway.app` (Railway se mila URL)
   - **Environment:** Production, Preview, Development (sab select karo)

### Step 2: Redeploy
1. Vercel Dashboard → Deployments
2. Latest deployment → "Redeploy" click karo
   Ya phir git push karo (auto deploy hoga)

---

## Testing

1. **Backend Test:**
   ```bash
   curl https://your-railway-url.up.railway.app/
   ```
   Response: `{"message": "RAG Chatbot API is running"}`

2. **Frontend Test:**
   - Website pe jao
   - Chatbot button click karo
   - Message send karo
   - Response aana chahiye!

---

## Alternative: Render (Free Tier)

Agar Railway nahi chahiye, Render use karo:

1. https://render.com pe jao
2. "New +" → "Web Service"
3. GitHub repo connect karo
4. Settings:
   - **Name:** rag-backend
   - **Root Directory:** rag-backend
   - **Environment:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn api_server:app --host 0.0.0.0 --port $PORT`
5. Environment variables add karo (same as Railway)
6. Deploy!

**Note:** Render free tier pe app sleep ho sakta hai. Always-on ke liye paid plan chahiye.

---

## Troubleshooting

### CORS Error?
- Backend mein `ALLOWED_ORIGINS` variable check karo
- Frontend URL properly set hona chahiye

### 404 Error?
- Backend URL sahi hai? Check karo
- `/chat` endpoint accessible hai?

### Environment Variables?
- Railway/Render dashboard mein sab variables properly set hain?
- `.env` file local development ke liye hai, production mein platform variables use hote hain

---

## Cost Estimate

- **Railway:** Free tier available, $5/month for better performance
- **Render:** Free tier (sleeps after inactivity), $7/month for always-on
- **Fly.io:** Free tier available, pay-as-you-go

**Recommendation:** Start with Railway free tier, upgrade if needed!

---

## Summary

1. ✅ Railway pe backend deploy karo
2. ✅ Backend URL copy karo
3. ✅ Vercel mein `REACT_APP_API_URL` set karo
4. ✅ Redeploy frontend
5. ✅ Test karo!

Done! 🎉
