# Zekiel Apparel — Cloudflare Workers Deploy Guide

The site runs as a single Cloudflare Worker with Static Assets:

| Piece | Where it lives |
|---|---|
| Public website + admin SPA | `/public` folder, served by the Worker's built-in asset pipeline |
| API backend (auth, content) | `src/index.js` (Hono app) |
| Uploaded images | **R2** bucket `zekiel-apparel-uploads` |
| Content + admin credentials | **KV** namespace `zekiel-content` |

One project, one deploy, one URL. Free tier is generous: 100,000 requests/day and zero egress fees on R2.

---

## Part 1 — Create the storage resources (3 min)

### 1. Sign in
Go to [dash.cloudflare.com](https://dash.cloudflare.com) (free account, no card).

### 2. Create the KV namespace
1. Left sidebar → **Storage & Databases** → **KV**
2. **Create a namespace** → name: `zekiel-content` → **Add**

### 3. Create the R2 bucket
1. Left sidebar → **R2 Object Storage** → **Overview**
2. First time? Agree to R2 terms (no card for free tier)
3. **Create bucket** → name: `zekiel-apparel-uploads` → Location: Automatic → **Create**

---

## Part 2 — Create the Worker project (5 min)

### 4. Start project setup
1. Dashboard → **Workers & Pages** → **Create**
2. Click **Import a repository** (or **Connect to Git** — same thing in newer UIs)
3. Choose **GitHub** → authorize → pick **ZekielApparel**
4. **Begin setup**

### 5. Configure
On the "Set up your application" page:

| Field | Value |
|---|---|
| Project name | `zekiel-apparel` |
| Build command | *(leave empty)* |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | *(leave empty)* |
| Path | `/` |
| API token | Create a new one → give it the `Edit Cloudflare Workers` template and **add** the `Cloudflare Pages → Edit` permission |

Click **Create and deploy**. First deploy will take ~1 minute.

### 6. Attach KV and R2 bindings
After first deploy → click into **zekiel-apparel** → **Settings** → **Bindings** → **Add**:

| Binding | Type | Variable name | Resource |
|---|---|---|---|
| 1 | KV namespace | `ZEKIEL_KV` | `zekiel-content` |
| 2 | R2 bucket | `ZEKIEL_R2` | `zekiel-apparel-uploads` |

⚠️ Variable names must match exactly — the code reads `env.ZEKIEL_KV` and `env.ZEKIEL_R2`.

### 7. Add environment variables
Still in **Settings** → **Variables and Secrets** → **Add**:

| Variable | Type | Value |
|---|---|---|
| `ADMIN_EMAIL` | Plaintext | `zekielapparel@gmail.com` |
| `ADMIN_PASSWORD` | **Secret** | a strong password (min 12 chars) |
| `JWT_SECRET` | **Secret** | any long random string (32+ chars of nonsense) |

### 8. Redeploy to pick up bindings
Deployments → **⋯** on latest → **Retry deployment** → wait ~1 min.

---

## Part 3 — Test (2 min)

Your URL is at the top of the project page, something like:
```
https://zekiel-apparel.<your-subdomain>.workers.dev
```

### 9. Public site
Open your URL — the homepage should load with all your content.

### 10. Admin panel
Go to `https://your-url/admin/` → log in:
- Email: `zekielapparel@gmail.com`
- Password: the `ADMIN_PASSWORD` you set in step 7

Once logged in, open the **Account** tab and change your password.

### 11. Test an upload
1. Go to **Gallery** in the admin
2. Click any tile → upload a photo → **Save All Changes**
3. Refresh your public site — the photo should appear

---

## Project structure

```
ZekielApparel/
├── public/                 # Static assets (served automatically)
│   ├── index.html, about.html, etc.
│   ├── admin/              # Admin SPA
│   ├── css/, js/, images/
│   └── _headers
├── src/
│   ├── index.js            # Worker entry (Hono app)
│   └── seed.js             # Default content for first run
├── wrangler.jsonc          # Worker config
├── package.json            # Dependencies (Hono, JWT)
└── DEPLOY.md
```

---

## Custom domain

Workers & Pages → project → **Settings** → **Domains & Routes** → **Add** → enter your domain. Cloudflare handles DNS + SSL.

---

## Free-tier limits

- **Workers requests:** 100,000 per day
- **KV:** 100,000 reads, 1,000 writes, 1 GB storage per day
- **R2:** 10 GB storage, zero egress fees

Enough headroom for a small fashion business. Workers Paid ($5/month) gives you millions of requests if you ever outgrow the free tier.
