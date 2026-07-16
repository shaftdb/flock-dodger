/**
 * Flock Dodger — public configuration
 *
 * Payments: Rumble Wallet (crypto tips) — primary.
 * Stripe remains optional fallback if you ever want cards.
 *
 * Rumble does NOT offer a card checkout API for external sites.
 * Supporters send BTC / USDT to your wallet receive address (or tip your
 * Rumble channel tip jar in the Rumble app).
 *
 * Fill in rumble.* below with YOUR details from the Rumble Wallet app:
 *   Receive → copy BTC / USDT address (correct network!).
 */

const AppConfig = {
  /**
   * ── Rumble Wallet (primary) ─────────────────────────────────────────────
   * Get addresses: Rumble Wallet app → Receive → choose BTC or USDT + network.
   * Tip jar: enable on your Rumble channel, then set channelUrl.
   */
  rumble: {
    /** Your Rumble username (display only), e.g. "shaftdb" */
    username: "shaftdb",

    /**
     * Link to your channel (tip jar works inside Rumble app / site).
     * Example: "https://rumble.com/c/YourChannel" or "https://rumble.com/user/shaftdb"
     */
    channelUrl: "https://rumble.com/user/shaftdb",

    /** Open Wallet download / home */
    walletUrl: "https://wallet.rumble.com/",

    /**
     * Crypto receive addresses from Rumble Wallet → Receive.
     * Leave empty until you paste real addresses — UI will say “add address in config”.
     * NEVER put seed phrases here — only public receive addresses.
     */
    addresses: {
      /** Bitcoin receive address */
      btc: "",
      /**
       * USDT (Tether) — include network in label so people don’t send on wrong chain.
       * Example address on Tron/Ethereum/etc. as shown in the wallet.
       */
      usdt: "",
      /** Network note shown under USDT, e.g. "TRC20 (Tron)" or "ERC20" */
      usdtNetwork: "Check Rumble Wallet for network",
    },

    /** Suggested amounts (USD-equivalent; user sends crypto) */
    amounts: {
      tip: "3",
      supporter: "15",
    },

    /**
     * After user taps “I’ve sent payment”, unlock Supporter on this device (honor system).
     * Fine for a personal tool; not fraud-proof without chain monitoring.
     */
    honorUnlock: true,
  },

  /** Optional Stripe fallback (leave empty to disable card checkout) */
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
    tip: {
      amount: 3,
      label: "$3",
      note: "Tip via Rumble Wallet (crypto)",
    },
    supporter: {
      amount: 14.99,
      label: "$15",
      note: "One-time Supporter via Rumble Wallet",
    },
  },

  cameras: {
    useLiveOsm: true,
    useCommunityReports: true,
  },
};
