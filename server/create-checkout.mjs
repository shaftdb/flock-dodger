/**
 * Minimal Stripe Checkout Session API for Flock Dodger one-time unlocks.
 *
 * Setup:
 *   1. npm install stripe  (in this folder or project root)
 *   2. set STRIPE_SECRET_KEY=sk_test_...
 *   3. set price IDs below or via env STRIPE_PRICE_OFFLINE, etc.
 *   4. node server/create-checkout.mjs
 *
 * Then set in js/config.js:
 *   checkoutApiUrl: "http://localhost:4242/api/create-checkout-session"
 *   publishableKey: "pk_test_..."
 *
 * Proxied path /api/... works if you put a reverse proxy in front.
 */

import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, extname, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PORT = Number(process.env.PORT || 4242);
const SECRET = process.env.STRIPE_SECRET_KEY || "";

const PRICE_IDS = {
  supporter: process.env.STRIPE_PRICE_SUPPORTER || process.env.STRIPE_PRICE_BUNDLE || "",
  tip: process.env.STRIPE_PRICE_TIP || "",
  // Legacy aliases → supporter
  offline: process.env.STRIPE_PRICE_OFFLINE || "",
  live_intel: process.env.STRIPE_PRICE_LIVE_INTEL || "",
  turn_by_turn: process.env.STRIPE_PRICE_TURN_BY_TURN || "",
  bundle: process.env.STRIPE_PRICE_BUNDLE || process.env.STRIPE_PRICE_SUPPORTER || "",
};

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

async function createCheckoutSession(body) {
  if (!SECRET) {
    const err = new Error("STRIPE_SECRET_KEY is not set");
    err.status = 500;
    throw err;
  }

  let featureId = body.featureId;
  if (featureId === "bundle" || featureId === "offline" || featureId === "live_intel" || featureId === "turn_by_turn") {
    featureId = PRICE_IDS.supporter ? "supporter" : featureId;
  }
  const price = PRICE_IDS[featureId] || PRICE_IDS.supporter;
  if (!price) {
    const err = new Error(`No price configured for "${featureId}" (set STRIPE_PRICE_SUPPORTER or STRIPE_PRICE_TIP)`);
    err.status = 400;
    throw err;
  }

  // Dynamic import so the static site still works without node_modules until needed
  let Stripe;
  try {
    Stripe = (await import("stripe")).default;
  } catch {
    const err = new Error('Install Stripe: npm install stripe');
    err.status = 500;
    throw err;
  }

  const stripe = new Stripe(SECRET);
  const origin = body.origin || `http://localhost:${PORT}`;
  const successUrl =
    body.successUrl ||
    `${origin}/index.html?checkout=success&feature=${encodeURIComponent(featureId)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl =
    body.cancelUrl || `${origin}/index.html?checkout=cancel&feature=${encodeURIComponent(featureId)}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { featureId, app: "flock-dodger" },
  });

  return { id: session.id, url: session.url };
}

function sendJson(res, status, obj) {
  const data = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data),
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  });
  res.end(data);
}

function serveStatic(req, res) {
  let path = req.url.split("?")[0];
  if (path === "/") path = "/index.html";
  const file = join(ROOT, path.replace(/^\//, ""));
  if (!file.startsWith(ROOT) || !existsSync(file)) {
    res.writeHead(404);
    res.end("Not found");
    return;
  }
  const ext = extname(file);
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  res.end(readFileSync(file));
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "POST" && req.url?.startsWith("/api/create-checkout-session")) {
    let raw = "";
    for await (const chunk of req) raw += chunk;
    try {
      const body = raw ? JSON.parse(raw) : {};
      body.origin = `${req.headers["x-forwarded-proto"] || "http"}://${req.headers.host}`;
      const session = await createCheckoutSession(body);
      sendJson(res, 200, session);
    } catch (err) {
      console.error(err);
      sendJson(res, err.status || 500, { error: err.message || "Checkout failed" });
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Method not allowed" });
});

server.listen(PORT, () => {
  console.log(`Flock Dodger + Stripe checkout on http://localhost:${PORT}`);
  console.log(SECRET ? "Stripe secret key: set" : "WARNING: STRIPE_SECRET_KEY not set (API will error)");
  console.log("Price IDs:", PRICE_IDS);
});
