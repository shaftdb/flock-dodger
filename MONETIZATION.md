# Flock Dodger — Monetization strategy

Research-backed approach for a **privacy-first** routing tool used occasionally on trips.

## What the research says

| Model | Pros | Cons for *this* product |
|--------|------|-------------------------|
| **Banner / interstitial ads** | Easy revenue at scale | Breaks privacy brand; tracking SDKs; high churn; competitors like DeFlock advertise *no ads* |
| **Rewarded ads** | Opt-in | Still loads ad networks; weak fit for a tool people open 2–5×/week |
| **Hard paywall** | Highest conversion in games/productivity | Wrong for privacy utilities — people won’t pay before they trust the route |
| **Subscription only** | Recurring revenue | Feels extractive for a mostly local/OSM-powered tool; privacy users resist “rent” |
| **Freemium + one-time unlock** | Free core builds trust; payers get power features | Needs a *clear* free/paid split |
| **Tips / “buy me a coffee”** | Zero friction guilt | Unpredictable revenue alone |

Industry freemium conversion is often **~2–5%**; that only works if free users still love the product. For niche tools, a **generous free tier + one honest paid tier** converts better than many micro-paywalls.

Privacy-adjacent products that retain trust (Proton, Mullvad, DeFlock-style tools) typically:

- Keep **core privacy value free**
- Avoid **tracking ads**
- Prefer **transparent paid support** or paid *extras*, not paywalled basics

## Payment rail: Rumble Wallet

Rumble Wallet is a **self-custodial crypto wallet** (BTC, USDT, XAUT). Creators receive tips; there is **no Stripe-style card API** for external sites.

**What “route payments to Rumble” means in practice:**

1. You paste **public receive addresses** (or a Rumble channel tip-jar link) into `js/config.js`.
2. Supporters open **Pay with Rumble Wallet**, copy address / open your channel, send crypto.
3. They tap **I’ve sent payment** → Supporter unlocks on that device (honor system).

There is no automatic chain watcher in this static app. For a personal tool that’s fine; for scale you’d verify txs later.

### Free forever (no account, no ads)

- Live OSM ALPR map layer  
- Standard vs camera-avoiding routes  
- Privacy score & buffer control  
- Export to Google / Apple / Waze  
- Saved routes (device only)  
- Community camera reports (local)  
- Drag endpoints / reshape route  

This is the product people need on a work trip. **Never put this behind a paywall.**

### Optional paid: **Supporter** (one-time Stripe)

**~\$14.99 one-time** (config; adjust later).

Unlocks “power / convenience” features that cost more to build or run, without taxing daily routing:

| Perk | Why people pay |
|------|----------------|
| **Offline region packs** | Real trip value (no cell service) |
| **Supporter badge + no “support us” nudges** | Quiet gratitude |
| **Priority offline / future nav features** | Turn-by-turn privacy nav when shipped |
| **Faster “Refresh live cameras” / higher caps** (optional later) | Power users |

**No subscription required.** Optional annual “Sustainer” can be added later *only* if you run real infrastructure costs (self-hosted Overpass, tile CDN).

### Soft support (non-annoying)

- One discreet **Support** entry in the sidebar (not a full-screen paywall on launch)  
- After a successful route **sometimes** (e.g. 1 in 8 sessions, dismissible, never blocks export)  
- **Tip jar** optional (\$3) for people who want to help without buying features  
- **No rewarded ads** — conflicts with privacy positioning  

### What we deliberately avoid

1. Ads that phone home (ad networks = tracking surface)  
2. Per-feature nickel-and-diming (\$3.99 × three features feels worse than one clear \$15 unlock)  
3. Hard paywall before first successful route  
4. Selling route/location data (legal + brand suicide)  
5. Fake “premium” that doesn’t do anything (demo unlocks only until Stripe is live)

## Pricing guidance

| Offer | Suggested | Notes |
|--------|-----------|--------|
| Tip | \$2–5 | Optional; no unlocks |
| Supporter (lifetime) | \$12–19 | Primary SKU |
| Sustainer (optional later) | \$2–4 / mo or \$20 / yr | Only if you pay for servers/APIs |

One-time fits “I use this on road trips” better than \$4.99/mo.

## Conversion moments (ethical)

Show support UI when value is proven, not when the app opens:

1. After first route with privacy score  
2. User taps Export to maps  
3. User opens Support / star icon voluntarily  

Never block: routing, map, export, or reports.

## Implementation map

| File | Role |
|------|------|
| `js/config.js` | Prices, Stripe links, soft-prompt settings |
| `js/premium.js` | `supporter` + `tip` unlocks; no ad dependency |
| `js/premium-ui.js` | Support modal + soft thank-you prompt |
| `server/create-checkout.mjs` | Stripe one-time for `supporter` / `tip` |

## Metrics to watch (when you have analytics *you* control)

- Free routes completed / week  
- Support modal open rate  
- Supporter conversion  
- Soft prompt dismiss rate (if >80% dismiss instantly, tone it down)  

Prefer privacy-friendly, first-party counters later — not third-party ad analytics.

## Bottom line

**Best fit for Flock Dodger:**  
**Free core forever + optional one-time Supporter + optional tip. No ads. No hard paywall.**

That matches how privacy tools earn trust and how trip utilities get paid without feeling like surveillance capitalism.
