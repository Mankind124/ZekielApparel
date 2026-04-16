# Zekiel Apparel — Cloudflare Deploy Guide

Your site runs entirely on Cloudflare's free tier:

| Piece | Cloudflare service |
|---|---|
| Public website | **Pages** |
| Admin panel | **Pages** (served from `/admin`) |
| API backend | **Pages Functions** (in `/functions`) |
| Admin login + content data | **KV** (key-value store) |
| Uploaded images | **R2** (object storage) |

Everything lives on one domain — one deploy, zero CORS, zero cold starts, free forever.

---

## Part 1 — Create the Cloudflare resources (5 min)

### 1. Sign up / sign in
Go to [dash.cloudflare.com](https://dash.cloudflare.com) and sign in (or sign up — free, no card required).

### 2. Create the KV namespace
This stores your site content and admin credentials.

1. Left sidebar → **Storage & Databases** → **KV**
2. Click **Create a namespace**
3. Name it `zekiel-content` → **Add**
4. You'll see a Namespace ID — you don't need to copy it, Cloudflare will link it later

### 3. Create the R2 bucket
This stores your uploaded images.

1. Left sidebar → **R2** → **Overview**
2. First time? Agree to the R2 terms (no card required for free tier)
3. Click **Create bucket**
4. Name it `zekiel-apparel-uploads`
5. Location: **Automatic**
6. Click **Create bucket**

---

## Part 2 — Deploy the site (5 min)

### 4. Create the Pages project
1. Left sidebar → **Workers & Pages** → **Create**
2. Click the **Pages** tab → **Connect to Git**
3. Click **GitHub** → authorize Cloudflare → select your **ZekielApparel** repo
4. Click **Begin setup**

### 5. Configure the build
- **Project name:** `zekiel-apparel` (this becomes part of your URL)
- **Production branch:** `main`
- **Framework preset:** None
- **Build command:** (leave empty)
- **Build output directory:** `/` (or leave empty)
- Click **Save and Deploy**

Wait ~1 minute for the first deploy.

### 6. Attach the KV namespace and R2 bucket to the project

After the first deploy finishes, go to your Pages project → **Settings** → **Bindings**.

**Add a KV namespace binding:**
- Click **Add** → **KV namespace**
- **Variable name:** `ZEKIEL_KV` (this exact name — the code looks for it)
- **KV namespace:** select `zekiel-content`
- Click **Save**

**Add an R2 bucket binding:**
- Click **Add** → **R2 bucket**
- **Variable name:** `ZEKIEL_R2` (this exact name)
- **R2 bucket:** select `zekiel-apparel-uploads`
- Click **Save**

### 7. Set the environment variables

Still in **Settings** → **Variables and Secrets**, click **Add**:

| Variable | Type | Value |
|---|---|---|
| `ADMIN_EMAIL` | Plaintext | `zekielapparel@gmail.com` |
| `ADMIN_PASSWORD` | **Secret** | a strong password (min 12 chars) — you'll use this to log in |
| `JWT_SECRET` | **Secret** | any long random string (32+ chars of nonsense) |

Choose **Secret** for `ADMIN_PASSWORD` and `JWT_SECRET` so they're encrypted and hidden.

### 8. Redeploy so the bindings take effect
1. Go to **Deployments** tab
2. Click the **⋯** menu on the latest deployment → **Retry deployment**
3. Wait ~1 minute

---

## Part 3 — Test it (2 min)

Your URL is shown at the top of the project page, something like:
```
https://zekiel-apparel.pages.dev
```

### 9. Test the public site
Open your URL — the homepage should load.

### 10. Test the admin panel
Go to `https://zekiel-apparel.pages.dev/admin/`

Log in with:
- **Email:** `zekielapparel@gmail.com`
- **Password:** the `ADMIN_PASSWORD` you set in step 7

Once in, go to the **Account** tab and change your password.

### 11. Test an image upload
1. Go to the **Gallery** tab in the admin
2. Click any item → upload a photo → **Save All Changes**
3. Refresh your public site — the photo should appear

---

## Your URLs

| What | URL |
|---|---|
| 🌐 Public site | `https://zekiel-apparel.pages.dev` |
| 🔐 Admin panel | `https://zekiel-apparel.pages.dev/admin/` |
| ⚙️ API | `https://zekiel-apparel.pages.dev/api/content` |

---

## What the admin panel can do

- **Business Info** — address, phones, email, hours, social links, bank details
- **Hero / Home** — banner text and CTA buttons
- **About & Story** — story paragraphs, stats
- **Core Values** — add / remove / reorder
- **Team** — members with photo upload and bios
- **Services & Prices** — manage services, set prices, flag featured ones
- **Gallery** — upload photos, categorise, organise
- **Testimonials** — client reviews with star ratings
- **Discounts** — promo codes with active/inactive toggle (shows as a site-wide banner)
- **FAQ** — add/remove questions on the services page
- **Account** — change admin password

Every save is instant — the public site updates in real time.

---

## Custom domain (optional)

In the Pages project → **Custom domains** → **Set up a custom domain** → enter `zekielapparel.com` (or whichever you own). Cloudflare handles the DNS + SSL automatically.

---

## Free tier limits — plenty of headroom for a small business

- **Pages:** unlimited requests, unlimited bandwidth
- **Pages Functions:** 100,000 requests/day
- **KV:** 100,000 reads/day, 1,000 writes/day, 1 GB storage
- **R2:** 10 GB storage, zero egress fees (image bandwidth is free!)

If you ever outgrow the free tier, Workers Paid is $5/month with much higher limits.
