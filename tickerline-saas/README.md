# Tickerline — AI stock-analysis SaaS (subscription starter)

A real, deployable web app where customers pay **$11/month**, your **secret** Anthropic
key powers their analyses, each user's spend is **metered and capped**, and you keep the
difference. Built with Next.js + Stripe + Vercel Postgres.

---

## How the money works

```
Customer pays Stripe  ──►  $11.00 / month
Your API cost (capped) ──►  up to  $6.00  of metered usage   (MONTHLY_USAGE_CAP_CENTS)
Stripe fee (~2.9%+30¢) ──►  about  $0.62
                              ───────
Your margin            ──►  about  $4.38 per subscriber, guaranteed
```

- Every Claude call returns its exact token usage. The backend converts that to cents
  (`lib/pricing.js`) and adds it to the user's monthly total (`usage` table).
- When a user reaches the cap, analyses are paused with a friendly message until their
  next billing cycle. **A heavy user can never cost you more than the cap**, so you're
  never upside-down.
- Want a bigger margin? Lower `MONTHLY_USAGE_CAP_CENTS`, or set `ANTHROPIC_MODEL` to
  `claude-haiku-4-5-20251001` (5× cheaper than Sonnet) — most users won't notice.

> Note: you are reselling AI access. That's a normal business, but you're responsible for
> your own terms of service, and "AI stock analysis" shown to paying strangers carries
> some real-world responsibility. The app shows a "not financial advice" disclaimer
> everywhere; keep it.

---

## What you need (the minimum: 2 accounts)

1. **Vercel** (free) — hosts the site, the backend, and the database.
2. **Stripe** (free to start) — collects the subscriptions.

Everything else (database, auth) lives inside those two.

---

## Setup, step by step

### 1. Get the code running locally (optional but recommended)
```bash
npm install
cp .env.example .env.local      # then fill in the values below
npm run dev                     # opens http://localhost:3000
```

### 2. Anthropic
- At https://console.anthropic.com create an API key and **buy some credits**.
- Put the key in `ANTHROPIC_API_KEY`. This is YOUR key — it stays on the server and is
  never exposed to customers.

### 3. Stripe
1. Create a **Product** → add a **recurring price** of $11/month. Copy its `price_…` id
   into `STRIPE_PRICE_ID`.
2. Copy your secret key (`sk_test_…` while testing) into `STRIPE_SECRET_KEY`.
3. Create a **webhook** (Developers → Webhooks → Add endpoint):
   - URL: `https://YOUR-APP.vercel.app/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`,
     `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy the signing secret (`whsec_…`) into `STRIPE_WEBHOOK_SECRET`.
4. (Testing) Use card `4242 4242 4242 4242`, any future date, any CVC.

### 4. Database (Vercel Postgres)
1. Push this folder to a GitHub repo.
2. On Vercel, **Import** the repo → deploy.
3. In the project: **Storage → Create → Postgres**. Vercel auto-adds `POSTGRES_URL`.
4. Open the database's **Query** tab, paste the contents of `db/schema.sql`, run it.

### 5. Environment variables on Vercel
Project → Settings → Environment Variables — add every key from `.env.example`
(`ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`,
`STRIPE_PRICE_ID`, `MONTHLY_USAGE_CAP_CENTS`, `AUTH_SECRET`, `APP_URL`).
Set `APP_URL` to your real Vercel URL. Redeploy.

Done — visit your URL, sign up, subscribe with the test card, and analyze a stock.

---

## How it fits together

```
app/page.js                  the whole UI (auth, paywall, analyzer, account)
app/api/signup|login|logout  email + password accounts (bcrypt, signed cookie)
app/api/me                   returns subscription status + remaining usage
app/api/checkout             starts a Stripe subscription
app/api/portal               Stripe billing portal (cancel / update card)
app/api/stripe/webhook       flips users to "active" when they pay
app/api/analyze              ← the gated, metered core (sub check → Claude → meter)
app/api/ask                  gated, metered Q&A
lib/pricing.js               token → cents, and your monthly cap
lib/anthropic.js             server-side Claude call + JSON repair
lib/db.js / lib/auth.js      database + session helpers
```

The two routes that matter most are `analyze` and `ask`: both refuse anyone without an
active subscription, refuse anyone over their cap, call Claude with the server key, then
record exactly what it cost.

---

## Going live
- Switch Stripe from test keys to live keys, and re-create the webhook on the live mode.
- Add a Terms of Service and Privacy page.
- Consider email verification before allowing subscriptions.
- Watch your Anthropic spend for the first week to confirm the metering matches reality.
```
```
