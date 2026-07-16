# Flock Dodger

Privacy-first web app for planning routes that avoid Flock Safety and ALPR camera corridors.

**Stack:** HTML · Tailwind CSS · Leaflet.js · vanilla JavaScript · PWA

## Features

- **Start / end geocoding** via OpenStreetMap Nominatim
- **Standard vs camera-avoiding routes** (OSRM routing + avoidance waypoints)
- **Interactive dark map** with live OSM ALPR markers + your local reports
- **Avoidance buffer slider** (50–500 m)
- **Privacy score & stats** — cameras avoided, residual exposure, extra distance/time
- **Saved routes** in `localStorage` (device-only)
- **Export to maps** — open planned route in Google Maps, Apple Maps, or Waze
- **Community camera reports** — form saves sightings to `localStorage` and includes them in routing/map
- **PWA** — installable, offline app shell via service worker
- **Support (optional)** — free core forever; one-time Supporter / tip via Stripe; **no ads** (see [MONETIZATION.md](./MONETIZATION.md))

## Quick start

Serve the folder over HTTP (required for geolocation, service worker, and some APIs):

```bash
# Python
python -m http.server 8080

# Node
npx --yes serve -l 8080
```

Open `http://localhost:8080`.

### Use it on your phone

See **[DEPLOY.md](./DEPLOY.md)** for:

- **GitHub Pages** (free public HTTPS URL — best long-term)
- **Netlify Drop** (drag-and-drop, no git)
- **Same Wi‑Fi** access to your PC

This repo includes a GitHub Actions workflow (`.github/workflows/deploy-pages.yml`) that publishes the site when you push to `main`.

> **Tip:** Try **WV / OH demo** or an Austin pair — the mock camera dataset is densest there.

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

- **Live cameras:** OpenStreetMap via Overpass (`js/overpass.js`) — community-mapped ALPR / Flock nodes. Coverage varies by area.
- **Community reports** merge from this device’s localStorage only.
- No built-in mock camera dataset.
- **WV / OH demo** button: Parkersburg, WV → Athens, OH (good camera-rich corridor).
- Public OSRM / Nominatim rate limits apply; heavy use may need self-hosted instances.
- Avoidance is a **simulation**: offset via-points + alternative route scoring, not guaranteed camera-free navigation.
- Offline map packs remain demo stubs after unlock; the service worker caches the app shell only.

## Support & Stripe

**Core routing is free forever** (no ads). Optional one-time Supporter / tip via Stripe. Details: **[MONETIZATION.md](./MONETIZATION.md)**.

| Offer | Default | Effect |
|--------|---------|--------|
| **Supporter** | $14.99 once | Lifetime perks; funds development |
| **Tip** | $3 once | Thanks only |

Stored in `localStorage` on device. Configure Payment Links for `supporter` / `tip` in `js/config.js`, or `STRIPE_PRICE_SUPPORTER` / `STRIPE_PRICE_TIP` with `server/create-checkout.mjs`.

## License

Prototype for educational / personal privacy tooling. Respect local laws and map provider terms of use.
