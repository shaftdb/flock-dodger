/**
 * Flock Dodger — public configuration
 *
 * Monetization model (see MONETIZATION.md):
 * - Free forever: routing, live OSM cameras, export, reports
 * - Optional one-time Supporter (Stripe)
 * - Optional tip (no unlocks required)
 * - No ads / no tracking ad networks
 *
 * Stripe: set publishableKey + paymentLinks OR checkoutApiUrl.
 * Never put your secret key in the browser.
 */

const AppConfig = {
  stripe: {
    publishableKey: "",

    /** POST { featureId } → { url } — see server/create-checkout.mjs */
    checkoutApiUrl: "/api/create-checkout-session",

    /**
     * Stripe Payment Links (Dashboard → Payment Links, mode: payment).
     * Success URL example:
     *   https://yoursite/index.html?checkout=success&feature=supporter
     */
    paymentLinks: {
      // supporter: "https://buy.stripe.com/test_xxxxxxxx",
      // tip: "https://buy.stripe.com/test_xxxxxxxx",
    },

    priceIds: {
      supporter: "",
      tip: "",
    },

    /** Demo checkout when Stripe is not configured (local testing) */
    allowDemoCheckout: true,
  },

  /**
   * Soft support prompts — never block core features.
   * Shown only after value (e.g. successful route), rarely.
   */
  support: {
    /** Show soft “support the project” after successful routes */
    softPromptEnabled: true,
    /** Show at most once per N successful route plans (this device) */
    softPromptEveryNRoutes: 8,
    /** Don’t show again for this many days after dismiss */
    softPromptCooldownSnoozeDays: 14,
  },

  // Display prices (marketing; real charge is Stripe)
  prices: {
    tip: {
      amount: 3,
      label: "$3",
      note: "Optional tip — keeps the lights on",
    },
    supporter: {
      amount: 14.99,
      label: "$14.99",
      note: "One-time · lifetime Supporter",
    },
  },

  cameras: {
    useLiveOsm: true,
    useCommunityReports: true,
  },
};
