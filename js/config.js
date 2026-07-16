/**
 * Flock Dodger — public configuration
 *
 * Payments (easiest first):
 *   1. PayPal.me  — if you already have PayPal
 *   2. Cash App   — if you already have Cash App ($cashtag)
 *   3. Rumble     — optional crypto (more friction)
 *
 * No new merchant account required beyond an app you already use.
 * Paste your links below. Leave blank to hide that option.
 */

const AppConfig = {
  /**
   * Support payments — fill any you already use.
   * Suggested amounts are embedded in the URL when possible.
   */
  payments: {
    /**
     * PayPal.me — create at https://www.paypal.com/paypalme (free if you have PayPal)
     * Examples:
     *   "https://paypal.me/YourName"
     *   "https://paypal.me/YourName/15"  (pre-fills $15)
     */
    paypalMe: "",

    /**
     * Cash App — your $cashtag only (no $), e.g. "YourTag"
     * Opens: https://cash.app/$YourTag/15
     * You must already have Cash App; no separate merchant signup.
     */
    cashAppTag: "",

    /** Optional Rumble channel for tip jar (leave empty to hide) */
    rumbleChannelUrl: "",
    rumbleUsername: "",

    /** Optional crypto receive addresses (advanced; leave empty to hide) */
    crypto: {
      btc: "",
      usdt: "",
      usdtNetwork: "",
    },

    /** USD amounts shown / appended to payment links */
    amounts: {
      tip: "3",
      supporter: "15",
    },

    /**
     * After “I’ve sent payment”, unlock Supporter on this device.
     * Honor system — fine for a personal tool.
     */
    honorUnlock: true,
  },

  /** Legacy key — UI still reads AppConfig.rumble if present */
  rumble: {
    username: "",
    channelUrl: "",
    walletUrl: "https://wallet.rumble.com/",
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
    softPromptEveryNRoutes: 8,
    softPromptSnoozeDays: 14,
  },

  prices: {
    tip: { amount: 3, label: "$3", note: "Tip via PayPal or Cash App" },
    supporter: { amount: 15, label: "$15", note: "One-time Supporter" },
  },

  cameras: {
    useLiveOsm: true,
    useCommunityReports: true,
  },
};

// Keep rumble.* in sync with payments for older code paths
(function syncRumbleFromPayments() {
  const p = AppConfig.payments;
  if (!p) return;
  AppConfig.rumble = AppConfig.rumble || {};
  if (p.rumbleUsername) AppConfig.rumble.username = p.rumbleUsername;
  if (p.rumbleChannelUrl) AppConfig.rumble.channelUrl = p.rumbleChannelUrl;
  AppConfig.rumble.amounts = p.amounts || AppConfig.rumble.amounts;
  AppConfig.rumble.addresses = {
    btc: p.crypto?.btc || "",
    usdt: p.crypto?.usdt || "",
    usdtNetwork: p.crypto?.usdtNetwork || "",
  };
  AppConfig.rumble.honorUnlock = p.honorUnlock !== false;
})();
