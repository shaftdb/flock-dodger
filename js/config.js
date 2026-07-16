/**
 * Flock Dodger — public configuration
 *
 * Payments: Cash App only ($brewologist).
 *
 * Security note:
 * - A $cashtag is a *receive* handle. Knowing it does NOT let someone log into
 *   your Cash App (they still need password / PIN / biometrics / 2FA).
 * - You cannot fully hide a payment destination and still get paid easily.
 * - UI shows a “Pay with Cash App” button; cashtag is not plastered large.
 * - In Cash App: enable 2FA, lock the app, and review Privacy so strangers
 *   can’t easily find you by phone/email if you prefer.
 */

const AppConfig = {
  payments: {
    /** Cash App $cashtag without the $ */
    cashAppTag: "brewologist",

    amounts: {
      tip: "3",
      supporter: "15",
    },

    /** Unlock Supporter after user confirms they sent payment (honor system) */
    honorUnlock: true,

    crypto: {
      btc: "",
      usdt: "",
      usdtNetwork: "",
    },
  },

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
    softPromptEnabled: true,
    softPromptEveryNRoutes: 10,
    softPromptSnoozeDays: 14,
  },

  prices: {
    tip: { amount: 3, label: "$3", note: "Tip via Cash App" },
    supporter: { amount: 15, label: "$15", note: "Supporter via Cash App" },
  },

  cameras: {
    useLiveOsm: true,
    useCommunityReports: true,
    /** "all" = broader OSM surveillance; "alpr" = plate readers / Flock only */
    osmMode: "all",
  },
};
