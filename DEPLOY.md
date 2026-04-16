# Zekiel Apparel — Deployment Guide

Two parts deploy separately:

1. **Backend API + Admin Panel** → Render (`/server/`)
2. **Public website** → Vercel (everything at the repo root)

---

## Part 1: Deploy backend to Render

1. Go to [render.com](https://render.com) and sign in with GitHub.
2. Click **New → Blueprint** and select your `ZekielApparel` repo.
   Render auto-detects `render.yaml`.
3. On the review screen you'll be asked for one secret:
   - `ADMIN_PASSWORD` → type a strong password (at least 12 chars). This is what you'll use to log in to the admin panel the first time.
4. Click **Apply** and wait ~2 minutes for the build.
5. When finished, copy your Render URL — it looks like:
   ```
   https://zekiel-apparel-api.onrender.com
   ```

### Test the backend

- Health check: `https://YOUR-URL.onrender.com/api/health`
- Admin login: `https://YOUR-URL.onrender.com/admin/`

Log in with:
- Email: `zekielapparel@gmail.com`
- Password: whatever you set for `ADMIN_PASSWORD`

Go to the **Account** tab and change your password immediately.

---

## Part 2: Point the frontend at the backend

1. Open `js/api-config.js` in the repo.
2. Replace the production URL with your Render URL from step 5 above:
   ```js
   return 'https://YOUR-RENDER-URL.onrender.com';
   ```
3. Commit and push to GitHub.

---

## Part 3: Deploy frontend to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New → Project** → import the `ZekielApparel` repo.
3. Leave all settings as default (Vercel auto-detects it's a static site).
4. Click **Deploy**.
5. When finished, you'll get a URL like:
   ```
   https://zekiel-apparel.vercel.app
   ```

---

## Your URLs

| What | URL |
|---|---|
| Public website | `https://zekiel-apparel.vercel.app` |
| Admin panel | `https://YOUR-RENDER-URL.onrender.com/admin/` |
| API | `https://YOUR-RENDER-URL.onrender.com/api/content` |

---

## What the admin panel can do

- **Business Info** — address, phones, email, hours, social links, bank details
- **Hero / Home** — banner text and call-to-action buttons
- **About & Story** — story paragraphs, stats (years, clients, pieces)
- **Core Values** — add/remove/reorder value cards
- **Team** — add/remove members with photos and bios
- **Services & Prices** — manage service list with prices (flag featured ones for the home page)
- **Gallery** — upload photos, categorise, organise, delete
- **Testimonials** — add/edit client reviews with star ratings
- **Discounts** — create, toggle active/inactive, promo codes (shows as a banner site-wide when active)
- **FAQ** — add/remove questions on the services page
- **Account** — change your admin password

Every save commits the change to the Render backend and the public site updates instantly (no redeploy).

---

## Running locally (optional)

```bash
# Backend
cd server
npm install
cp .env.example .env     # edit values
npm start
# → http://localhost:3000/admin

# Frontend (open in a different terminal)
# Just open index.html in your browser, or use a simple local server like:
npx serve .
```

When running locally, `js/api-config.js` auto-detects localhost and uses `http://localhost:3000` for the API.

---

## Notes on the free Render plan

- The backend may "sleep" after 15 minutes of inactivity. The first request wakes it up (takes ~30 seconds).
- Uploaded images and content changes are persisted to a 1 GB disk — they survive restarts.
- For always-on hosting, upgrade to Render Starter ($7/mo).
