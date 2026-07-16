/**
 * Premium unlocks — rewarded ads (placeholder) + Stripe one-time checkout.
 */

const Premium = (() => {
  const STORAGE_KEY = "flock-dodger-premium";
  const AD_USAGE_KEY = "flock-dodger-ad-usage";

  const FEATURES = {
    offline: {
      id: "offline",
      name: "Offline mode",
      description: "Download map tiles & camera packs for offline navigation.",
      icon: "offline",
      permanentViaPurchase: true,
      allowRewarded: true,
    },
    live_intel: {
      id: "live_intel",
      name: "Live camera intel",
      description: "Community-sourced updates & crowd verification of ALPR placements.",
      icon: "intel",
      permanentViaPurchase: true,
      allowRewarded: true,
    },
    turn_by_turn: {
      id: "turn_by_turn",
      name: "Turn-by-turn privacy nav",
      description: "Voice guidance that re-routes when new cameras appear ahead.",
      icon: "nav",
      permanentViaPurchase: true,
      allowRewarded: true,
    },
  };

  const BUNDLE_ID = "bundle";

  // ── Persistence ──────────────────────────────────────────────────────────

  function loadState() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveState(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  /**
   * @returns {{ unlocked: boolean, permanent: boolean, method?: string, expiresAt?: number|null }}
   */
  function getUnlock(featureId) {
    const state = loadState();
    const entry = state[featureId];
    if (!entry || !entry.unlocked) {
      return { unlocked: false, permanent: false };
    }
    if (entry.permanent) {
      return { unlocked: true, permanent: true, method: entry.method || "purchase" };
    }
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete state[featureId];
      saveState(state);
      return { unlocked: false, permanent: false };
    }
    return {
      unlocked: true,
      permanent: false,
      method: entry.method || "rewarded_ad",
      expiresAt: entry.expiresAt || null,
    };
  }

  function isUnlocked(featureId) {
    return getUnlock(featureId).unlocked;
  }

  function unlockPermanent(featureId, method = "purchase") {
    const state = loadState();
    const ids = featureId === BUNDLE_ID ? Object.keys(FEATURES) : [featureId];
    for (const id of ids) {
      state[id] = {
        unlocked: true,
        permanent: true,
        method,
        unlockedAt: new Date().toISOString(),
        expiresAt: null,
      };
    }
    if (featureId === BUNDLE_ID) {
      state[BUNDLE_ID] = {
        unlocked: true,
        permanent: true,
        method,
        unlockedAt: new Date().toISOString(),
      };
    }
    saveState(state);
    emitChange();
    return state;
  }

  function unlockTimed(featureId, ttlMs, method = "rewarded_ad") {
    const state = loadState();
    const existing = getUnlock(featureId);
    if (existing.permanent) return loadState();

    const ttl = ttlMs ?? AppConfig.ads.rewardTtlMs;
    state[featureId] = {
      unlocked: true,
      permanent: false,
      method,
      unlockedAt: new Date().toISOString(),
      expiresAt: Date.now() + ttl,
    };
    saveState(state);
    emitChange();
    return state;
  }

  function revoke(featureId) {
    const state = loadState();
    delete state[featureId];
    saveState(state);
    emitChange();
  }

  // ── Rewarded ad usage limits ─────────────────────────────────────────────

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function loadAdUsage() {
    try {
      return JSON.parse(localStorage.getItem(AD_USAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function getAdCountToday(featureId) {
    const u = loadAdUsage();
    const day = todayKey();
    if (u.day !== day) return 0;
    return u.counts?.[featureId] || 0;
  }

  function incrementAdCount(featureId) {
    const day = todayKey();
    let u = loadAdUsage();
    if (u.day !== day) u = { day, counts: {} };
    u.counts = u.counts || {};
    u.counts[featureId] = (u.counts[featureId] || 0) + 1;
    localStorage.setItem(AD_USAGE_KEY, JSON.stringify(u));
    return u.counts[featureId];
  }

  function canWatchRewarded(featureId) {
    const feature = FEATURES[featureId];
    if (!feature?.allowRewarded) return { ok: false, reason: "Ads not available for this feature." };
    if (getUnlock(featureId).permanent) return { ok: false, reason: "Already permanently unlocked." };
    const max = AppConfig.ads.maxRewardsPerDay ?? 3;
    const used = getAdCountToday(featureId);
    if (used >= max) {
      return { ok: false, reason: `Daily ad limit reached (${max}/day). Try again tomorrow or buy a permanent unlock.` };
    }
    return { ok: true, remaining: max - used };
  }

  /**
   * Placeholder rewarded ad — replace body with AdMob / Unity / ironSource SDK.
   * @param {string} featureId
   * @param {{ onProgress?: (p:number)=>void, signal?: AbortSignal }} [opts]
   * @returns {Promise<{ completed: boolean }>}
   */
  function watchRewardedAd(featureId, opts = {}) {
    const check = canWatchRewarded(featureId);
    if (!check.ok) {
      return Promise.reject(new Error(check.reason));
    }

    const durationSec = AppConfig.ads.rewardDurationSec || 12;
    const durationMs = durationSec * 1000;
    const start = Date.now();

    return new Promise((resolve, reject) => {
      let raf = null;
      let settled = false;

      const cleanup = () => {
        if (raf) cancelAnimationFrame(raf);
        if (opts.signal) opts.signal.removeEventListener("abort", onAbort);
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve({ completed: false });
      };

      if (opts.signal) {
        if (opts.signal.aborted) {
          resolve({ completed: false });
          return;
        }
        opts.signal.addEventListener("abort", onAbort);
      }

      const tick = () => {
        if (settled) return;
        const elapsed = Date.now() - start;
        const p = Math.min(1, elapsed / durationMs);
        if (typeof opts.onProgress === "function") opts.onProgress(p);
        if (p >= 1) {
          settled = true;
          cleanup();
          incrementAdCount(featureId);
          unlockTimed(featureId, AppConfig.ads.rewardTtlMs, "rewarded_ad");
          resolve({ completed: true });
          return;
        }
        raf = requestAnimationFrame(tick);
      };

      // Simulate network request to ad SDK
      console.info(
        `[Premium] Loading rewarded ad placeholder for "${featureId}" via ${AppConfig.ads.networkLabel}`
      );
      raf = requestAnimationFrame(tick);
    });
  }

  // ── Stripe checkout ──────────────────────────────────────────────────────

  function stripeConfigured() {
    const s = AppConfig.stripe || {};
    const hasLinks = s.paymentLinks && Object.values(s.paymentLinks).some(Boolean);
    const hasKey = Boolean(s.publishableKey && s.publishableKey.startsWith("pk_"));
    const hasApi = Boolean(s.checkoutApiUrl);
    return { hasLinks, hasKey, hasApi, any: hasLinks || (hasKey && hasApi) };
  }

  function successUrl(featureId) {
    const u = new URL(window.location.href.split("?")[0]);
    // Stripe replaces {CHECKOUT_SESSION_ID} literally in success_url
    u.searchParams.set("checkout", "success");
    u.searchParams.set("feature", featureId);
    // Append template token outside URLSearchParams (it would encode braces)
    return `${u.origin}${u.pathname}?checkout=success&feature=${encodeURIComponent(featureId)}&session_id={CHECKOUT_SESSION_ID}`;
  }

  function cancelUrl(featureId) {
    return `${window.location.origin}${window.location.pathname}?checkout=cancel&feature=${encodeURIComponent(featureId || "")}`;
  }

  /**
   * Start one-time purchase for a feature or bundle.
   * @param {string} featureId offline | live_intel | turn_by_turn | bundle
   */
  async function startCheckout(featureId) {
    const s = AppConfig.stripe || {};
    const cfg = stripeConfigured();

    // 1) Payment Link (simplest production path for static hosting)
    const link = s.paymentLinks?.[featureId];
    if (link) {
      // Stash pending feature so return URL without params can still unlock after Payment Link
      sessionStorage.setItem("fd-pending-checkout", featureId);
      window.location.href = link;
      return { method: "payment_link" };
    }

    // 2) Server-created Checkout Session
    if (s.checkoutApiUrl && (cfg.hasKey || s.checkoutApiUrl.startsWith("/") || s.checkoutApiUrl.startsWith("http"))) {
      try {
        const res = await fetch(s.checkoutApiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            featureId,
            successUrl: successUrl(featureId),
            cancelUrl: cancelUrl(featureId),
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            sessionStorage.setItem("fd-pending-checkout", featureId);
            window.location.href = data.url;
            return { method: "checkout_session", sessionId: data.id };
          }
          // Stripe.js redirectToCheckout with sessionId
          if (data.id && s.publishableKey && window.Stripe) {
            sessionStorage.setItem("fd-pending-checkout", featureId);
            const stripe = window.Stripe(s.publishableKey);
            const { error } = await stripe.redirectToCheckout({ sessionId: data.id });
            if (error) throw new Error(error.message);
            return { method: "checkout_session", sessionId: data.id };
          }
        } else {
          // Fall through to demo if API missing in dev
          const errText = await res.text().catch(() => "");
          console.warn("[Premium] Checkout API error", res.status, errText);
          if (!s.allowDemoCheckout) {
            throw new Error("Checkout service unavailable. Configure Stripe Payment Links or the checkout API.");
          }
        }
      } catch (err) {
        console.warn("[Premium] Checkout API failed", err);
        if (!s.allowDemoCheckout) throw err;
      }
    }

    // 3) Demo checkout (local unlock for development)
    if (s.allowDemoCheckout) {
      return { method: "demo", featureId };
    }

    throw new Error(
      "Stripe is not configured. Add paymentLinks or checkoutApiUrl + publishableKey in js/config.js."
    );
  }

  /**
   * Handle return from Stripe (?checkout=success&feature=...&session_id=...)
   */
  function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) {
      // Payment Links may return without our params — honor pending + success hash patterns
      return null;
    }

    const featureId = params.get("feature") || sessionStorage.getItem("fd-pending-checkout");
    const sessionId = params.get("session_id");

    // Clean URL
    const clean = new URL(window.location.href);
    clean.searchParams.delete("checkout");
    clean.searchParams.delete("feature");
    clean.searchParams.delete("session_id");
    window.history.replaceState({}, "", clean.pathname + clean.search + clean.hash);

    if (status === "cancel") {
      sessionStorage.removeItem("fd-pending-checkout");
      return { status: "cancel", featureId };
    }

    if (status === "success" && featureId) {
      // Production: verify session_id with your backend before unlock.
      // Prototype: trust return URL (fine for demo; not fraud-proof).
      if (sessionId && sessionId !== "{CHECKOUT_SESSION_ID}") {
        console.info("[Premium] Stripe session", sessionId);
      }
      unlockPermanent(featureId, "stripe");
      sessionStorage.removeItem("fd-pending-checkout");
      return { status: "success", featureId, sessionId };
    }

    return { status, featureId };
  }

  /** Complete demo purchase after UI confirmation */
  function completeDemoPurchase(featureId) {
    unlockPermanent(featureId, "demo_stripe");
    return getUnlock(featureId === BUNDLE_ID ? "offline" : featureId);
  }

  // ── Events ───────────────────────────────────────────────────────────────

  const listeners = new Set();

  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  function emitChange() {
    const snapshot = loadState();
    listeners.forEach((fn) => {
      try {
        fn(snapshot);
      } catch (e) {
        console.error(e);
      }
    });
  }

  function formatExpiry(expiresAt) {
    if (!expiresAt) return null;
    const ms = expiresAt - Date.now();
    if (ms <= 0) return "expired";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h >= 24) {
      const d = Math.floor(h / 24);
      return `${d}d ${h % 24}h left`;
    }
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  }

  function listFeatures() {
    return Object.values(FEATURES);
  }

  return {
    FEATURES,
    BUNDLE_ID,
    getUnlock,
    isUnlocked,
    unlockPermanent,
    unlockTimed,
    revoke,
    canWatchRewarded,
    watchRewardedAd,
    startCheckout,
    handleCheckoutReturn,
    completeDemoPurchase,
    stripeConfigured,
    onChange,
    formatExpiry,
    listFeatures,
    loadState,
  };
})();
