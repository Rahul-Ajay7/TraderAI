# Migration: Railway → HuggingFace Space + Neon (fully free, no card)

State before migration: Railway trial expired. Data already backed up to
`C:\Users\RAHUL\Desktop\traderai_db_backup\railway_dump.sql`.

## 1. Neon — free Postgres (5 min)
1. https://neon.tech → Sign up (GitHub login works, no card)
2. Create project → name `traderai` → region closest (Singapore)
3. Dashboard → **Connection string** → copy the `postgresql://...` URL
   (choose the **pooled** connection string if offered)

## 2. Restore the data (2 min, on your PC)
```powershell
cd C:\Users\RAHUL\Desktop\Files\React\TraderAI
$env:DATABASE_URL="PASTE_NEON_URL_HERE"
.\venv\Scripts\python.exe scripts\restore_dump.py C:\Users\RAHUL\Desktop\traderai_db_backup\railway_dump.sql
```
Prints row counts at the end — expect candles ~10.8k, trades 190, predictions ~12.9k.

## 3. HuggingFace Space — the bot (10 min)
1. https://huggingface.co → sign up (no card)
2. New Space → name `traderai-backend` → SDK: **Docker** → visibility Public → Create
3. Space → Settings → **Variables and secrets** → New secret:
   - `DATABASE_URL` = the Neon URL
   - (optional) `HF_TOKEN` = your HF read token (faster model downloads)
4. Push the repo to the Space (from your PC):
```powershell
cd C:\Users\RAHUL\Desktop\Files\React\TraderAI
git remote add hf https://huggingface.co/spaces/YOUR_HF_USERNAME/traderai-backend
git push hf main   # asks for HF username + access token (Settings → Access Tokens → write)
```
5. Space builds (~15 min first time, torch is heavy). Logs tab should show
   `[DB] Using PostgreSQL`, `[KRONOS] Model ready`, `[CYCLE]` lines.
6. Backend URL = `https://YOUR_HF_USERNAME-traderai-backend.hf.space`
   Test: open `<that URL>/api/health` — should return JSON.

## 4. Keepalive — stop the 48h sleep (3 min)
1. https://cron-job.org → sign up free
2. Create cronjob → URL = `https://...hf.space/api/health` → every **15 minutes**
3. Enable. Space now never idles out.

## 5. Vercel — point frontend at the new backend (2 min)
1. Vercel dashboard → project → Settings → **Environment Variables**
2. Add `VITE_BACKEND_URL` = `https://YOUR_HF_USERNAME-traderai-backend.hf.space`
3. Deployments → Redeploy latest. Done — dashboard live again.

## Notes
- Space filesystem is ephemeral — fine: data lives in Neon, Kronos re-downloads on boot.
- Every `git push hf main` rebuilds the Space (same as Railway did).
- Keep pushing to GitHub too: `git push` (origin) for code history, `git push hf main` to deploy.
- Old Railway DATABASE_URL is dead with the trial; if you ever reused that password anywhere, rotate it.
