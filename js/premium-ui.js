/**
 * Support UI — optional one-time Supporter / tip. Never blocks core routing.
 */

const PremiumUI = (() => {
  const $ = (id) => document.getElementById(id);

  function toast(msg, type) {
    if (typeof window.__flockToast === "function") window.__flockToast(msg, type);
    else console.info(msg);
  }

  function priceLabel(id) {
    return AppConfig.prices?.[id]?.label || "—";
  }

  function renderFeatureList() {
    const list = $("premium-feature-list");
    if (!list) return;

    const supporter = Premium.isSupporter();

    list.innerHTML = `
      <div class="premium-card${supporter ? " premium-card--unlocked" : ""}">
        <div class="flex items-start gap-2.5">
          <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flock-accent/15 text-flock-accent">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.8 5.7 21 8 14 2 9.2h7.6L12 2z"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium">Core routing</p>
              <span class="badge-unlocked">Free forever</span>
            </div>
            <p class="text-xs text-flock-muted mt-0.5">Live OSM cameras, privacy routes, export, saved routes, reports. No ads. No account.</p>
          </div>
        </div>
      </div>
      <div class="premium-card${supporter ? " premium-card--unlocked" : ""}">
        <div class="flex items-start gap-2.5">
          <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flock-warn/10 text-flock-warn">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2v-7M12 2v10m0 0l-3-3m3 3l3-3"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium">Supporter</p>
              ${
                supporter
                  ? `<span class="badge-unlocked">Thank you</span>`
                  : `<span class="badge-soon">Optional</span>`
              }
            </div>
            <p class="text-xs text-flock-muted mt-0.5">One-time purchase. Funds development &amp; future offline packs / privacy nav. No subscription.</p>
            <div class="mt-2 flex items-center justify-between gap-2">
              <span class="text-[11px] font-mono text-flock-dim">${supporter ? "Unlocked" : priceLabel("supporter") + " once"}</span>
              <button type="button" class="text-[11px] text-flock-accent font-medium" data-open-support>
                ${supporter ? "Details" : "Support"}
              </button>
            </div>
          </div>
        </div>
      </div>`;

    list.querySelectorAll("[data-open-support]").forEach((btn) => {
      btn.addEventListener("click", openSupportModal);
    });

    const bundlePrice = $("bundle-price");
    if (bundlePrice) bundlePrice.textContent = priceLabel("supporter");

    const buyBundle = $("btn-buy-bundle");
    if (buyBundle) {
      buyBundle.disabled = supporter;
      buyBundle.textContent = supporter ? "You're a Supporter" : "Become a Supporter";
      buyBundle.classList.toggle("opacity-50", supporter);
    }

    const tipPrice = $("tip-price");
    if (tipPrice) tipPrice.textContent = priceLabel("tip");

    const dot = $("premium-dot");
    if (dot) dot.classList.toggle("hidden", !supporter);

    renderActivePanels();
  }

  function renderActivePanels() {
    const host = $("premium-active-panels");
    if (!host) return;
    if (!Premium.isSupporter()) {
      host.classList.add("hidden");
      host.innerHTML = "";
      return;
    }
    host.classList.remove("hidden");
    host.innerHTML = `
      <h2 class="section-label">Supporter perks</h2>
      <div class="stat-card">
        <p class="text-sm font-medium mb-1">Thank you</p>
        <p class="text-xs text-flock-muted mb-2">Soft support prompts are off. Offline packs &amp; privacy nav will unlock here as they ship.</p>
        <button type="button" class="btn-secondary w-full text-xs" data-offline-pack="oh-wv">Offline pack demo (coming soon)</button>
      </div>`;
    host.querySelector("[data-offline-pack]")?.addEventListener("click", () => {
      toast("Offline packs are next — your Supporter unlock is saved on this device", "success");
    });
  }

  function openSupportModal() {
    const modal = $("premium-modal");
    const body = $("premium-modal-body");
    const title = $("premium-modal-title");
    if (!modal || !body) return;

    const supporter = Premium.isSupporter();
    if (title) title.textContent = "Support Flock Dodger";

    body.innerHTML = `
      <p class="text-sm text-flock-dim leading-relaxed">
        Core routing stays <strong class="text-flock-text">free forever</strong> — no ads, no account, no tracking paywall.
        Optional support funds development of offline packs and better privacy nav.
      </p>

      ${
        supporter
          ? `<div class="rounded-xl border border-flock-accent/30 bg-flock-accent/10 px-3 py-3">
              <p class="text-sm font-medium text-flock-accent">You're a Supporter</p>
              <p class="text-xs text-flock-muted mt-1">Saved on this device. Thank you for keeping the free tier alive for everyone.</p>
            </div>`
          : `
      <button type="button" id="btn-buy-supporter" class="unlock-option unlock-option--stripe w-full">
        <div class="flex items-start gap-3 text-left">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flock-accent/15 text-flock-accent">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.8 5.7 21 8 14 2 9.2h7.6L12 2z"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">Become a Supporter</p>
            <p class="text-xs text-flock-muted mt-0.5">One-time ${priceLabel("supporter")} · lifetime on this device · no subscription</p>
          </div>
        </div>
      </button>

      <button type="button" id="btn-buy-tip" class="unlock-option w-full">
        <div class="flex items-start gap-3 text-left">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flock-warn/10 text-flock-warn">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">Tip jar</p>
            <p class="text-xs text-flock-muted mt-0.5">${priceLabel("tip")} once · no features, just thanks</p>
          </div>
        </div>
      </button>`
      }

      <ul class="text-[11px] text-flock-muted space-y-1 leading-relaxed">
        <li>• We never sell route or location data</li>
        <li>• No ad networks or tracking SDKs for monetization</li>
        <li>• Soft “support us” notes only after a successful route, and rarely</li>
      </ul>

      <button type="button" class="btn-secondary w-full text-xs" data-close-premium>Close</button>`;

    body.querySelector("#btn-buy-supporter")?.addEventListener("click", () => {
      closePremiumModal();
      beginCheckout("supporter");
    });
    body.querySelector("#btn-buy-tip")?.addEventListener("click", () => {
      closePremiumModal();
      beginCheckout("tip");
    });
    body.querySelectorAll("[data-close-premium]").forEach((el) => {
      el.addEventListener("click", closePremiumModal);
    });

    modal.hidden = false;
  }

  function closePremiumModal() {
    const modal = $("premium-modal");
    if (modal) modal.hidden = true;
  }

  function openUnlockModal(featureId) {
    // Compat: any feature open → support modal
    openSupportModal(featureId);
  }

  async function beginCheckout(featureId) {
    try {
      const result = await Premium.startCheckout(featureId);
      if (result.method === "demo") {
        openStripeDemo(featureId);
        return;
      }
    } catch (err) {
      toast(err.message || "Checkout failed", "error");
    }
  }

  let demoFeatureId = null;

  function openStripeDemo(featureId) {
    demoFeatureId = featureId;
    const modal = $("stripe-demo-modal");
    const item = $("stripe-demo-item");
    const price = $("stripe-demo-price");
    const desc = $("stripe-demo-desc");
    const name =
      featureId === "tip"
        ? "Tip the project"
        : featureId === "supporter" || featureId === "bundle"
          ? "Flock Dodger Supporter (lifetime)"
          : Premium.FEATURES[featureId]?.name || featureId;

    if (item) item.textContent = name;
    if (price) price.textContent = priceLabel(featureId === "bundle" ? "supporter" : featureId);
    if (desc) {
      desc.textContent = `Demo checkout for “${name}”. No card is charged. Wire Stripe in js/config.js for live payments.`;
    }
    if (modal) modal.hidden = false;
  }

  function closeStripeDemo() {
    const modal = $("stripe-demo-modal");
    if (modal) modal.hidden = true;
    demoFeatureId = null;
  }

  function confirmStripeDemo() {
    if (!demoFeatureId) return;
    const id = demoFeatureId;
    Premium.completeDemoPurchase(id);
    closeStripeDemo();
    renderFeatureList();
    if (id === "tip") toast("Thanks for the tip (demo)", "success");
    else toast("You're a Supporter — thank you (demo)", "success");
  }

  function maybeSoftPrompt() {
    if (!Premium.shouldShowSoftPrompt()) return;
    const banner = $("support-soft-prompt");
    if (banner) banner.hidden = false;
  }

  function hideSoftPrompt(snooze) {
    const banner = $("support-soft-prompt");
    if (banner) banner.hidden = true;
    if (snooze) Premium.snoozeSoftPrompt();
  }

  function init() {
    renderFeatureList();

    $("btn-premium")?.addEventListener("click", openSupportModal);
    $("btn-premium-open")?.addEventListener("click", openSupportModal);
    $("btn-buy-bundle")?.addEventListener("click", () => {
      if (Premium.isSupporter()) {
        openSupportModal();
        return;
      }
      beginCheckout("supporter");
    });
    $("btn-buy-tip")?.addEventListener("click", () => beginCheckout("tip"));

    document.querySelectorAll("[data-close-premium]").forEach((el) => {
      el.addEventListener("click", closePremiumModal);
    });
    document.querySelectorAll("[data-close-stripe-demo]").forEach((el) => {
      el.addEventListener("click", closeStripeDemo);
    });
    $("btn-stripe-demo-pay")?.addEventListener("click", confirmStripeDemo);

    $("btn-soft-support")?.addEventListener("click", () => {
      hideSoftPrompt(true);
      openSupportModal();
    });
    $("btn-soft-dismiss")?.addEventListener("click", () => hideSoftPrompt(true));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePremiumModal();
        closeStripeDemo();
        hideSoftPrompt(false);
      }
    });

    Premium.onChange(() => renderFeatureList());

    const ret = Premium.handleCheckoutReturn();
    if (ret?.status === "success") {
      renderFeatureList();
      setTimeout(() => {
        if (ret.featureId === "tip") toast("Thank you for the tip!", "success");
        else toast("You're a Supporter — thank you for funding free core routing", "success");
      }, 50);
    } else if (ret?.status === "cancel") {
      setTimeout(() => toast("Checkout cancelled", "error"), 50);
    }

    // Expose for app.js after successful route
    window.__flockAfterRouteSuccess = () => {
      Premium.recordSuccessfulRoute();
      maybeSoftPrompt();
    };
  }

  return {
    init,
    openUnlockModal,
    openSupportModal,
    renderFeatureList,
    beginCheckout,
    maybeSoftPrompt,
  };
})();

function bootPremiumUI() {
  if (typeof Premium === "undefined") {
    console.error("Premium module missing");
    return;
  }
  PremiumUI.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootPremiumUI);
} else {
  bootPremiumUI();
}
