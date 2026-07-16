/**
 * Support / monetization — one-time Supporter + optional tip.
 * Core routing stays free. No ad networks.
 */

const Premium = (() => {
  const STORAGE_KEY = "flock-dodger-premium";
  const META_KEY = "flock-dodger-support-meta";

  /** Single paid product + optional tip SKU */
  const PRODUCTS = {
    supporter: {
      id: "supporter",
      name: "Supporter",
      description:
        "One-time thank-you that funds development. Unlocks convenience perks (offline packs when available) and removes soft support prompts.",
      permanent: true,
    },
    tip: {
      id: "tip",
      name: "Tip the project",
      description: "One-time tip. No features required — pure support.",
      permanent: false, // recorded as thank-you, not a feature gate
    },
  };

  // Legacy feature ids still accepted as “supporter” if someone unlocked old SKUs
  const LEGACY_SUPPORTER_KEYS = ["offline", "live_intel", "turn_by_turn", "bundle", "supporter"];

  const BUNDLE_ID = "supporter";

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

  function loadMeta() {
    try {
      return JSON.parse(localStorage.getItem(META_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveMeta(partial) {
    const next = { ...loadMeta(), ...partial };
    localStorage.setItem(META_KEY, JSON.stringify(next));
    return next;
  }

  function isSupporter() {
    const state = loadState();
    if (state.supporter?.unlocked && state.supporter.permanent) return true;
    // Migrate: any permanent legacy unlock counts as supporter
    for (const key of LEGACY_SUPPORTER_KEYS) {
      if (key === "supporter") continue;
      if (state[key]?.unlocked && state[key]?.permanent) return true;
    }
    return false;
  }

  function getUnlock(featureId) {
    if (featureId === "supporter" || featureId === "bundle") {
      const ok = isSupporter();
      return {
        unlocked: ok,
        permanent: ok,
        method: ok ? loadState().supporter?.method || "purchase" : undefined,
      };
    }
    // Convenience aliases for future gated perks
    if (["offline", "live_intel", "turn_by_turn"].includes(featureId)) {
      const ok = isSupporter();
      return { unlocked: ok, permanent: ok, method: ok ? "supporter" : undefined };
    }
    const state = loadState();
    const entry = state[featureId];
    if (!entry?.unlocked) return { unlocked: false, permanent: false };
    return {
      unlocked: true,
      permanent: Boolean(entry.permanent),
      method: entry.method,
      expiresAt: entry.expiresAt || null,
    };
  }

  function isUnlocked(featureId) {
    return getUnlock(featureId).unlocked;
  }

  function unlockPermanent(featureId, method = "purchase") {
    const state = loadState();
    if (featureId === "tip") {
      state.tip = {
        unlocked: true,
        permanent: false,
        method,
        tippedAt: new Date().toISOString(),
        count: (state.tip?.count || 0) + 1,
      };
      saveState(state);
      emitChange();
      return state;
    }

    // supporter / bundle / legacy ids
    const ids =
      featureId === "bundle" || featureId === "supporter"
        ? ["supporter"]
        : LEGACY_SUPPORTER_KEYS.includes(featureId)
          ? ["supporter", featureId]
          : [featureId];

    for (const id of ids) {
      state[id] = {
        unlocked: true,
        permanent: id === "supporter" || LEGACY_SUPPORTER_KEYS.includes(id),
        method,
        unlockedAt: new Date().toISOString(),
        expiresAt: null,
      };
    }
    state.supporter = {
      unlocked: true,
      permanent: true,
      method,
      unlockedAt: new Date().toISOString(),
      expiresAt: null,
    };
    saveState(state);
    emitChange();
    return state;
  }

  function unlockTimed() {
    // Ads removed — no timed unlocks
    return loadState();
  }

  function revoke(featureId) {
    const state = loadState();
    delete state[featureId];
    saveState(state);
    emitChange();
  }

  function canWatchRewarded() {
    return { ok: false, reason: "Ads are disabled — privacy first. Support is optional and one-time." };
  }

  function watchRewardedAd() {
    return Promise.reject(new Error("Ads are disabled on Flock Dodger."));
  }

  function paymentsConfig() {
    return AppConfig.payments || {};
  }

  function paymentOptionsConfigured() {
    const p = paymentsConfig();
    const crypto = Boolean((p.crypto?.btc || "").trim() || (p.crypto?.usdt || "").trim());
    return {
      crypto,
      any: crypto,
    };
  }

  function rumbleConfigured() {
    const opts = paymentOptionsConfigured();
    return { hasAddr: opts.crypto, hasChannel: false, username: "", any: opts.any };
  }

  function buildPaypalUrl() {
    return "";
  }

  function buildCashAppUrl() {
    return "";
  }

  function stripeConfigured() {
    const s = AppConfig.stripe || {};
    const hasLinks = s.paymentLinks && Object.values(s.paymentLinks).some(Boolean);
    const hasKey = Boolean(s.publishableKey && s.publishableKey.startsWith("pk_"));
    const hasApi = Boolean(s.checkoutApiUrl);
    return { hasLinks, hasKey, hasApi, any: hasLinks || (hasKey && hasApi) };
  }

  function successUrl(featureId) {
    return `${window.location.origin}${window.location.pathname}?checkout=success&feature=${encodeURIComponent(
      featureId
    )}&session_id={CHECKOUT_SESSION_ID}`;
  }

  function cancelUrl(featureId) {
    return `${window.location.origin}${window.location.pathname}?checkout=cancel&feature=${encodeURIComponent(
      featureId || ""
    )}`;
  }

  /**
   * Start support payment. Opens simple PayPal / Cash App / Rumble chooser.
   */
  async function startCheckout(featureId) {
    const id = featureId === "bundle" ? "supporter" : featureId;
    return { method: "simple_pay", featureId: id };
  }

  function handleCheckoutReturn() {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("checkout");
    if (!status) return null;

    let featureId = params.get("feature") || sessionStorage.getItem("fd-pending-checkout");
    if (featureId === "bundle") featureId = "supporter";
    const sessionId = params.get("session_id");

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
      if (sessionId && sessionId !== "{CHECKOUT_SESSION_ID}") {
        console.info("[Premium] Stripe session", sessionId);
      }
      unlockPermanent(featureId, "stripe");
      sessionStorage.removeItem("fd-pending-checkout");
      return { status: "success", featureId, sessionId };
    }

    return { status, featureId };
  }

  function completeDemoPurchase(featureId) {
    const id = featureId === "bundle" ? "supporter" : featureId;
    unlockPermanent(id, "demo_stripe");
    return getUnlock(id === "tip" ? "supporter" : id);
  }

  // Soft prompt bookkeeping
  function recordSuccessfulRoute() {
    const meta = loadMeta();
    const n = (meta.routeSuccessCount || 0) + 1;
    saveMeta({ routeSuccessCount: n });
    return n;
  }

  function shouldShowSoftPrompt() {
    if (isSupporter()) return false;
    const cfg = AppConfig.support || {};
    if (cfg.softPromptEnabled === false) return false;

    const meta = loadMeta();
    if (meta.softPromptSnoozeUntil && Date.now() < meta.softPromptSnoozeUntil) return false;

    const every = cfg.softPromptEveryNRoutes || 8;
    const n = meta.routeSuccessCount || 0;
    if (n < every) return false;
    if (n % every !== 0) return false;
    return true;
  }

  function snoozeSoftPrompt() {
    const days = AppConfig.support?.softPromptSnoozeDays || 14;
    saveMeta({ softPromptSnoozeUntil: Date.now() + days * 24 * 60 * 60 * 1000 });
  }

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

  function formatExpiry() {
    return null;
  }

  function listFeatures() {
    // Compatibility: UI may still map supporter perks
    return [
      {
        id: "offline",
        name: "Offline region packs",
        description: "Download map & camera packs for trips without signal (Supporter).",
        icon: "offline",
        allowRewarded: false,
        permanentViaPurchase: true,
      },
      {
        id: "live_intel",
        name: "Supporter status",
        description: "Funds development. Removes soft prompts. Thanks for keeping core free for everyone.",
        icon: "intel",
        allowRewarded: false,
        permanentViaPurchase: true,
      },
      {
        id: "turn_by_turn",
        name: "Future privacy nav",
        description: "Supporter unlocks upcoming turn-by-turn privacy guidance when it ships.",
        icon: "nav",
        allowRewarded: false,
        permanentViaPurchase: true,
      },
    ];
  }

  return {
    FEATURES: {
      offline: listFeatures()[0],
      live_intel: listFeatures()[1],
      turn_by_turn: listFeatures()[2],
    },
    PRODUCTS,
    BUNDLE_ID,
    getUnlock,
    isUnlocked,
    isSupporter,
    unlockPermanent,
    unlockTimed,
    revoke,
    canWatchRewarded,
    watchRewardedAd,
    startCheckout,
    handleCheckoutReturn,
    completeDemoPurchase,
    stripeConfigured,
    rumbleConfigured,
    paymentOptionsConfigured,
    buildPaypalUrl,
    buildCashAppUrl,
    paymentsConfig,
    onChange,
    formatExpiry,
    listFeatures,
    loadState,
    recordSuccessfulRoute,
    shouldShowSoftPrompt,
    snoozeSoftPrompt,
  };
})();
