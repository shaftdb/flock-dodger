/**
 * Flock Dodger — public configuration
 *
 * Stripe: set publishableKey + either paymentLinks OR checkoutApiUrl (server).
 * Never put your secret key in the browser.
 */

const AppConfig = {
  // ── Stripe (test mode keys are fine for development) ─────────────────────
  stripe: {
    /** pk_test_... or pk_live_... from Stripe Dashboard */
    publishableKey: "",

    /**
     * Optional backend that creates Checkout Sessions.
     * POST { featureId } → { url } | { id, url }
     * See server/create-checkout.mjs
     */
    checkoutApiUrl: "/api/create-checkout-session",

    /**
     * Fallback: Stripe Payment Links (Dashboard → Payment Links).
     * Keys must match Premium.FEATURES ids (or "bundle").
     */
    paymentLinks: {
      // offline: "https://buy.stripe.com/test_xxxxxxxx",
      // live_intel: "https://buy.stripe.com/test_xxxxxxxx",
      // turn_by_turn: "https://buy.stripe.com/test_xxxxxxxx",
      // bundle: "https://buy.stripe.com/test_xxxxxxxx",
    },

    /**
     * Price IDs for server-created Checkout Sessions (price_...).
     * Used by create-checkout.mjs — mirrored here for docs only if needed client-side.
     */
    priceIds: {
      offline: "",
      live_intel: "",
      turn_by_turn: "",
      bundle: "",
    },

    /**
     * When true (default if no real Stripe config), Checkout opens a demo
     * success flow so unlocks can be tested without API keys.
     */
    allowDemoCheckout: true,
  },

  // ── Rewarded ads (placeholder for AdMob / Unity Ads / etc.) ───────────────
  ads: {
    /** Simulated ad length in seconds */
    rewardDurationSec: 12,
    /** How long a rewarded unlock lasts (ms). 24h default. */
    rewardTtlMs: 24 * 60 * 60 * 1000,
    /** Max rewarded unlocks per feature per calendar day (client-side soft limit) */
    maxRewardsPerDay: 3,
    /**
     * Placeholder network name shown in UI.
     * Swap watchRewardedAd() in premium.js for a real SDK later.
     */
    networkLabel: "Rewarded Ad (placeholder)",
  },

  // Display prices (marketing copy; real charge is Stripe)
  prices: {
    offline: { amount: 4.99, label: "$4.99" },
    live_intel: { amount: 3.99, label: "$3.99" },
    turn_by_turn: { amount: 5.99, label: "$5.99" },
    bundle: { amount: 9.99, label: "$9.99", note: "All premium features" },
  },

  /**
   * Live cameras from OpenStreetMap (Overpass).
   * Community-mapped ALPR / Flock nodes — best free accuracy source for trips.
   */
  cameras: {
    /** Prefer OSM Overpass when online (recommended for real trips) */
    useLiveOsm: true,
    /** Include built-in mock / procedural points (off by default for accuracy) */
    useMockData: false,
    /** Include your localStorage community reports */
    useCommunityReports: true,
  },
};
