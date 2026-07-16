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

  function hasCryptoPayments() {
    return Boolean(Premium.paymentOptionsConfigured?.().crypto);
  }

  function renderFeatureList() {
    const list = $("premium-feature-list");
    if (!list) return;

    const supporter = Premium.isSupporter();
    const canPay = hasCryptoPayments();

    list.innerHTML = `
      <div class="premium-card premium-card--unlocked">
        <div class="flex items-start gap-2.5">
          <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flock-accent/15 text-flock-accent">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.8 5.7 21 8 14 2 9.2h7.6L12 2z"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium">Everything here</p>
              <span class="badge-unlocked">Free forever</span>
            </div>
            <p class="text-xs text-flock-muted mt-0.5">Live OSM cameras, privacy routes, export, saves, reports. No ads. No account. No personal payment profiles.</p>
          </div>
        </div>
      </div>
      ${
        canPay || supporter
          ? `<div class="premium-card${supporter ? " premium-card--unlocked" : ""}">
        <div class="flex items-start gap-2.5">
          <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-flock-warn/10 text-flock-warn">
            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2 flex-wrap">
              <p class="text-sm font-medium">Optional crypto support</p>
              ${supporter ? `<span class="badge-unlocked">Thank you</span>` : `<span class="badge-soon">Optional</span>`}
            </div>
            <p class="text-xs text-flock-muted mt-0.5">Project wallet only (address, not a personal profile). Skip anytime.</p>
            <div class="mt-2 flex items-center justify-between gap-2">
              <span class="text-[11px] font-mono text-flock-dim">${supporter ? "Unlocked" : priceLabel("supporter") + " once"}</span>
              <button type="button" class="text-[11px] text-flock-accent font-medium" data-open-support>
                ${supporter ? "Details" : "Crypto support"}
              </button>
            </div>
          </div>
        </div>
      </div>`
          : `<div class="premium-card">
        <p class="text-xs text-flock-muted leading-relaxed">
          Payments aren’t enabled (keeps your personal accounts private). Use the app free.
          When you want support later: a <strong class="text-flock-dim">project-only crypto address</strong> is the simplest private option — see Support details.
        </p>
        <button type="button" class="mt-2 text-[11px] text-flock-accent font-medium" data-open-support>How support works</button>
      </div>`
      }`;

    list.querySelectorAll("[data-open-support]").forEach((btn) => {
      btn.addEventListener("click", openSupportModal);
    });

    const buyBundle = $("btn-buy-bundle");
    const tipBtn = $("btn-buy-tip");
    const payBox = $("support-pay-box");
    if (payBox) payBox.hidden = !canPay && !supporter;
    if (buyBundle) {
      buyBundle.hidden = !canPay;
      buyBundle.disabled = supporter;
      buyBundle.textContent = supporter ? "You're a Supporter" : "Crypto Supporter";
    }
    if (tipBtn) tipBtn.hidden = !canPay;

    const bundlePrice = $("bundle-price");
    if (bundlePrice) bundlePrice.textContent = priceLabel("supporter");
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
    const canPay = hasCryptoPayments();
    if (title) title.textContent = "Support Flock Dodger";

    body.innerHTML = `
      <p class="text-sm text-flock-dim leading-relaxed">
        Core routing stays <strong class="text-flock-text">free forever</strong> — no ads, no account, no personal payment profiles.
      </p>

      ${
        supporter
          ? `<div class="rounded-xl border border-flock-accent/30 bg-flock-accent/10 px-3 py-3">
              <p class="text-sm font-medium text-flock-accent">You're a Supporter</p>
              <p class="text-xs text-flock-muted mt-1">Saved on this device. Thank you.</p>
            </div>`
          : canPay
            ? `
      <button type="button" id="btn-buy-supporter" class="unlock-option w-full">
        <div class="flex items-start gap-3 text-left">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flock-accent/15 text-flock-accent">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">Crypto Supporter</p>
            <p class="text-xs text-flock-muted mt-0.5">~${priceLabel("supporter")} to project wallet · no name on the page</p>
          </div>
        </div>
      </button>
      <button type="button" id="btn-buy-tip" class="unlock-option w-full">
        <div class="flex items-start gap-3 text-left">
          <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flock-warn/10 text-flock-warn">
            <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>
          </div>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium">Crypto tip</p>
            <p class="text-xs text-flock-muted mt-0.5">~${priceLabel("tip")} · optional</p>
          </div>
        </div>
      </button>`
            : `
      <div class="rounded-xl border border-flock-border bg-flock-bg px-3 py-3 text-xs text-flock-dim leading-relaxed space-y-2">
        <p class="font-medium text-flock-text">Easiest private way to get paid later</p>
        <ol class="list-decimal pl-4 space-y-1.5">
          <li>Create a <strong class="text-flock-text">separate</strong> crypto wallet only for this project (not your daily wallet).</li>
          <li>Copy the <strong class="text-flock-text">public receive address</strong> (never the seed phrase).</li>
          <li>Paste it in <code class="text-flock-muted">js/config.js</code> → <code class="text-flock-muted">payments.crypto.btc</code>.</li>
        </ol>
        <p>The site only shows that address — not your real name or personal payment profiles.</p>
        <p class="text-flock-muted">Personal PayPal / Cash App links on a public site are a privacy risk — left out on purpose.</p>
      </div>`
      }

      <ul class="text-[11px] text-flock-muted space-y-1 leading-relaxed">
        <li>• We never sell route or location data</li>
        <li>• No ad networks</li>
        <li>• Personal payment apps stay off the public site by design</li>
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
      openSimplePay(result.featureId || featureId);
    } catch (err) {
      toast(err.message || "Checkout failed", "error");
    }
  }

  let rumblePayFeatureId = null;

  function openSimplePay(featureId) {
    rumblePayFeatureId = featureId === "bundle" ? "supporter" : featureId;
    const p = typeof Premium.paymentsConfig === "function" ? Premium.paymentsConfig() : AppConfig.payments || {};
    const modal = $("rumble-pay-modal");
    const item = $("rumble-pay-item");
    const amountEl = $("rumble-pay-amount");
    const desc = $("rumble-pay-desc");
    const addrHost = $("rumble-pay-addresses");
    const payButtons = $("pay-buttons");

    const isTip = rumblePayFeatureId === "tip";
    const usd = String(
      isTip ? p.amounts?.tip || AppConfig.prices?.tip?.amount || "3" : p.amounts?.supporter || "15"
    );
    const name = isTip ? "Crypto tip" : "Crypto Supporter";

    if (item) item.textContent = name;
    if (amountEl) amountEl.textContent = `~$${usd}`;
    if (desc) {
      desc.textContent = isTip
        ? `Send about $${usd} in BTC (or USDT) to the project address below. Optional.`
        : `Send about $${usd} in BTC (or USDT) to the project address for Supporter on this device.`;
    }

    if (payButtons) payButtons.innerHTML = "";

    if (addrHost) {
      addrHost.innerHTML = "";
      const btc = (p.crypto?.btc || "").trim();
      const usdt = (p.crypto?.usdt || "").trim();
      const net = p.crypto?.usdtNetwork || "";
      if (!btc && !usdt) {
        addrHost.innerHTML = `<p class="text-xs text-flock-warn">No project crypto address configured. App stays free-only.</p>`;
      } else {
        if (btc) addrHost.appendChild(addressRow("Bitcoin (BTC)", btc));
        if (usdt) addrHost.appendChild(addressRow(`USDT · ${net || "correct network only"}`, usdt));
      }
    }

    if (modal) modal.hidden = false;
  }

  function addressRow(label, address) {
    const wrap = document.createElement("div");
    wrap.className = "rounded-lg border border-flock-border bg-flock-surface/80 px-2.5 py-2";
    wrap.innerHTML = `
      <p class="text-[10px] uppercase tracking-wide text-flock-muted font-semibold mb-1">${escapeHtml(label)}</p>
      <div class="flex items-start gap-2">
        <code class="flex-1 min-w-0 break-all text-[11px] text-flock-text font-mono leading-snug">${escapeHtml(
          address
        )}</code>
        <button type="button" class="btn-secondary text-[10px] px-2 py-1 shrink-0" data-copy>Copy</button>
      </div>`;
    wrap.querySelector("[data-copy]")?.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(address);
        toast("Address copied", "success");
      } catch {
        toast("Could not copy — select and copy manually", "error");
      }
    });
    return wrap;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function closeRumblePay() {
    const modal = $("rumble-pay-modal");
    if (modal) modal.hidden = true;
    rumblePayFeatureId = null;
  }

  function confirmRumblePaid() {
    if (!rumblePayFeatureId) return;
    const id = rumblePayFeatureId;
    const honor = AppConfig.payments?.honorUnlock !== false;
    if (!honor && id === "supporter") {
      toast("Thanks — unlock after you confirm payment manually", "success");
      closeRumblePay();
      return;
    }
    Premium.unlockPermanent(id, "crypto");
    closeRumblePay();
    renderFeatureList();
    if (id === "tip") toast("Thank you for the tip!", "success");
    else toast("Supporter unlocked — thank you!", "success");
  }

  function maybeSoftPrompt() {
    // Only nudge about crypto support when a project address is configured
    if (!hasCryptoPayments()) return;
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
    document.querySelectorAll("[data-close-rumble-pay]").forEach((el) => {
      el.addEventListener("click", closeRumblePay);
    });
    $("btn-rumble-paid")?.addEventListener("click", confirmRumblePaid);

    $("btn-soft-support")?.addEventListener("click", () => {
      hideSoftPrompt(true);
      openSupportModal();
    });
    $("btn-soft-dismiss")?.addEventListener("click", () => hideSoftPrompt(true));

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePremiumModal();
        closeRumblePay();
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
