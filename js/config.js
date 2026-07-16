/**
 * Flock Dodger — public configuration
 *
 * Payments: personal PayPal/Cash App removed (privacy).
 *
 * Easiest private options if you want money later (pick one):
 *
 * 1) Project-only crypto wallet (recommended privacy)
 *    - Make a FREE wallet just for Flock Dodger (not your daily wallet).
 *    - Paste public receive address below — page shows only the address, not your name.
 *    - Examples: Strike, Muun, Cash App BTC *receive only if separate*, Exodus, etc.
 *
 * 2) Brand page under a project name (not your real name)
 *    - Ko-fi / Buy Me a Coffee as "FlockDodger" — still a new account, but no personal feed.
 *
 * 3) Real business payments later
 *    - Stripe or PayPal Business under a business/DBA name when you're ready.
 *
 * Until you fill crypto.addresses, the app is free-only (no payment buttons).
 */

const AppConfig = {
  payments: {
    /**
     * Optional project crypto receive addresses (public only — never seed phrases).
     * Leave empty = free-only mode (recommended until you set this up).
     */
    crypto: {
      /** e.g. Bitcoin receive address for a wallet used ONLY for this project */
      btc: "",
      /** optional USDT */
      usdt: "",
      usdtNetwork: "",
    },

    amounts: {
      tip: "3",
      supporter: "15",
    },

    /** Unlock Supporter after user confirms they sent crypto (honor system) */
    honorUnlock: true,
  },

  /** @deprecated kept empty — do not use personal accounts */
  rumble: {
    username: "",
    channelUrl: "",
    walletUrl: "",
    addresses: { btc: "", usdt: "", usdtNetwork: "" },
    amounts: { tip: "3", supporter: "15" },
    honorUnlock: true,
  },

  stripe: {
    publishableKey: "",
    checkoutApiUrl: "",
    paymentLinks: {},
    priceIds: {},
    allowDemoCheckout: false,
  },

  support: {
    /** Soft “thanks / free forever” only — no payment pitch if no crypto configured */
    softPromptEnabled: true,
    softPromptEveryNRoutes: 12,
    softPromptSnoozeDays: 21,
  },

  prices: {
    tip: { amount: 3, label: "$3", note: "Optional crypto tip" },
    supporter: { amount: 15, label: "$15", note: "Optional crypto Supporter" },
  },

  cameras: {
    useLiveOsm: true,
    useCommunityReports: true,
  },
};
