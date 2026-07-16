# Flock Dodger

Privacy-first web app for planning routes that avoid Flock Safety and ALPR camera corridors.

**Stack:** HTML · Tailwind CSS · Leaflet.js · vanilla JavaScript · PWA

## Features

- **Start / end geocoding** via OpenStreetMap Nominatim
- **Standard vs camera-avoiding routes** (OSRM routing + avoidance waypoints)
- **Interactive dark map** with ALPR markers (placeholder + procedural demo dataset)
- **Avoidance buffer slider** (50–500 m)
- **Privacy score & stats** — cameras avoided, residual exposure, extra distance/time
- **Saved routes** in `localStorage` (device-only)
- **Export to maps** — open planned route in Google Maps, Apple Maps, or Waze
- **Community camera reports** — form saves sightings to `localStorage` and includes them in routing/map
- **PWA** — installable, offline app shell via service worker
- **Premium unlocks** — rewarded ad placeholder (timed unlock) + Stripe one-time checkout (permanent)
- **Premium tools** — offline pack / live intel / turn-by-turn demos when unlocked

## Quick start

Serve the folder over HTTP (required for geolocation, service worker, and some APIs):

```bash
# Python
python -m http.server 8080

# Node
npx --yes serve -l 8080
```

Open `http://localhost:8080`.

> **Tip:** Try an Austin, TX pair (e.g. *Austin Convention Center* → *Barton Springs Pool*) — the demo dataset is densest around several U.S. metros.

## Privacy model

| Data | Where it goes |
|------|----------------|
| Addresses you type | Sent to public Nominatim (OSM) for geocoding |
| Route geometry | Sent to public OSRM demo server |
| Saved routes | **Only** `localStorage` on your device |
| Account / tracking | None |

No backend of your own is required for the prototype.

## Project layout

```
├── index.html          # App shell & UI
├── css/styles.css      # Dark theme, map, components
├── js/
│   ├── app.js          # Map, UI wiring, planning flow
│   ├── cameras.js      # Camera dataset + distance helpers
│   ├── geocoding.js    # Nominatim
│   ├── routing.js      # OSRM + avoidance scoring
│   ├── storage.js      # localStorage saved routes
│   └── pwa.js          # Install prompt + SW register
├── sw.js               # Service worker
├── manifest.json       # PWA manifest
└── icons/              # App icons
```

## Notes & limits

- Camera points are **illustrative** (~440+ named/corridor mocks in `js/camera-data.js`, dense for **Ohio & West Virginia**, plus US metros). Procedural fill is denser in the OH/WV hot region. Not a complete or verified real-world inventory.
- **WV / OH demo** button: Parkersburg, WV → Athens, OH (good camera-rich corridor).
- Public OSRM / Nominatim rate limits apply; heavy use may need self-hosted instances.
- Avoidance is a **simulation**: offset via-points + alternative route scoring, not guaranteed camera-free navigation.
- Offline map packs remain demo stubs after unlock; the service worker caches the app shell only.

## Premium & Stripe

Unlocks are stored in `localStorage` on the device.

| Path | Behavior |
|------|----------|
| **Watch ad** | Placeholder rewarded video (countdown). Grants **24h** unlock (configurable). Soft cap: 3/day/feature. |
| **Stripe** | One-time permanent unlock for a feature or the full bundle. |

### Demo mode (default)

With empty Stripe config, **Buy** opens a **demo Checkout** modal and unlocks locally (no charge). Good for UI testing.

### Real Stripe — Payment Links (simplest)

1. Create one-time Payment Links in [Stripe Dashboard](https://dashboard.stripe.com/payment-links).
2. Set success URL to:  
   `https://your-domain/index.html?checkout=success&feature=offline`  
   (use `live_intel`, `turn_by_turn`, or `bundle` as needed).
3. Put links in `js/config.js` → `stripe.paymentLinks`.

### Real Stripe — Checkout Sessions (server)

```bash
cd server
npm install
set STRIPE_SECRET_KEY=sk_test_...
set STRIPE_PRICE_OFFLINE=price_...
set STRIPE_PRICE_LIVE_INTEL=price_...
set STRIPE_PRICE_TURN_BY_TURN=price_...
set STRIPE_PRICE_BUNDLE=price_...
npm start
```

In `js/config.js`:

```js
publishableKey: "pk_test_...",
checkoutApiUrl: "http://localhost:4242/api/create-checkout-session",
allowDemoCheckout: false,
```

> Production should verify `session_id` on a backend before granting permanent unlocks. This prototype trusts the success return URL.

## License

Prototype for educational / personal privacy tooling. Respect local laws and map provider terms of use.
