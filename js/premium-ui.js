/**
 * Premium unlock UI — feature cards, rewarded ad modal, Stripe checkout.
 */

const PremiumUI = (() => {
  let activeFeatureId = null;
  let adAbort = null;
  let demoFeatureId = null;

  const $ = (id) => document.getElementById(id);

  const ICONS = {
    offline: `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 002 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/></svg>`,
    live_intel: `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10M18 20V4M6 20v-4"/></svg>`,
    turn_by_turn: `<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg>`,
  };

  const ICON_COLORS = {
    offline: "bg-flock-warn/10 text-flock-warn",
    live_intel: "bg-flock-route/10 text-flock-route",
    turn_by_turn: "bg-violet-400/10 text-violet-400",
  };

  function toast(msg, type) {
    if (typeof window.__flockToast === "function") window.__flockToast(msg, type);
    else console.info(msg);
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function priceLabel(id) {
    return AppConfig.prices?.[id]?.label || "—";
  }

  // ── Feature list in sidebar ──────────────────────────────────────────────

  function renderFeatureList() {
    const list = $("premium-feature-list");
    if (!list) return;

    list.innerHTML = Premium.listFeatures()
      .map((f) => {
        const unlock = Premium.getUnlock(f.id);
        const badge = unlock.unlocked
          ? unlock.permanent
            ? `<span class="badge-unlocked">Unlocked</span>`
            : `<span class="badge-temp">Ad · ${escapeHtml(Premium.formatExpiry(unlock.expiresAt) || "temp")}</span>`
          : `<span class="badge-soon">Premium</span>`;

        const action = unlock.unlocked
          ? `<button type="button" class="text-[11px] text-flock-accent font-medium" data-premium-open="${f.id}">Manage</button>`
          : `<button type="button" class="text-[11px] text-flock-accent font-medium" data-premium-open="${f.id}">Unlock</button>`;

        return `
          <div class="premium-card${unlock.unlocked ? " premium-card--unlocked" : ""}" data-feature-card="${f.id}">
            <div class="flex items-start gap-2.5">
              <div class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${ICON_COLORS[f.id] || "bg-flock-border text-flock-dim"}">
                ${ICONS[f.id] || ICONS.offline}
              </div>
              <div class="min-w-0 flex-1">
                <div class="flex items-center gap-2 flex-wrap">
                  <p class="text-sm font-medium">${escapeHtml(f.name)}</p>
                  ${badge}
                </div>
                <p class="text-xs text-flock-muted mt-0.5">${escapeHtml(f.description)}</p>
                <div class="mt-2 flex items-center justify-between gap-2">
                  <span class="text-[11px] font-mono text-flock-dim">${unlock.permanent ? "Owned" : priceLabel(f.id) + " one-time"}</span>
                  ${action}
                </div>
              </div>
            </div>
          </div>`;
      })
      .join("");

    list.querySelectorAll("[data-premium-open]").forEach((btn) => {
      btn.addEventListener("click", () => openUnlockModal(btn.getAttribute("data-premium-open")));
    });

    const bundlePrice = $("bundle-price");
    if (bundlePrice) bundlePrice.textContent = priceLabel("bundle");

    const allPermanent = Premium.listFeatures().every((f) => Premium.getUnlock(f.id).permanent);
    const buyBundle = $("btn-buy-bundle");
    if (buyBundle) {
      buyBundle.disabled = allPermanent;
      buyBundle.textContent = allPermanent ? "Bundle owned" : "Buy with Stripe";
      buyBundle.classList.toggle("opacity-50", allPermanent);
    }

    const dot = $("premium-dot");
    if (dot) {
      const any = Premium.listFeatures().some((f) => Premium.isUnlocked(f.id));
      dot.classList.toggle("hidden", !any);
    }

    renderActivePanels();
  }

  function renderActivePanels() {
    const host = $("premium-active-panels");
    if (!host) return;
    const unlocked = Premium.listFeatures().filter((f) => Premium.isUnlocked(f.id));
    if (!unlocked.length) {
      host.classList.add("hidden");
      host.innerHTML = "";
      return;
    }
    host.classList.remove("hidden");
    host.innerHTML = `
      <h2 class="section-label">Your premium tools</h2>
      ${unlocked
        .map((f) => {
          if (f.id === "offline") {
            return `
              <div class="stat-card">
                <p class="text-sm font-medium mb-1">Offline packs</p>
                <p class="text-xs text-flock-muted mb-2">Region packs are simulated for this prototype.</p>
                <button type="button" class="btn-secondary w-full text-xs" data-offline-pack="oh-wv">Download OH / WV pack (demo)</button>
              </div>`;
          }
          if (f.id === "live_intel") {
            return `
              <div class="stat-card">
                <p class="text-sm font-medium mb-1">Live camera intel</p>
                <p class="text-xs text-flock-muted mb-2">Last sync: demo feed · +0 community reports nearby</p>
                <button type="button" class="btn-secondary w-full text-xs" data-intel-sync>Refresh intel (demo)</button>
              </div>`;
          }
          if (f.id === "turn_by_turn") {
            return `
              <div class="stat-card">
                <p class="text-sm font-medium mb-1">Privacy navigation</p>
                <p class="text-xs text-flock-muted mb-2">Voice guidance stub — re-route alerts when cameras enter buffer.</p>
                <button type="button" class="btn-secondary w-full text-xs" data-nav-start>Start guidance (demo)</button>
              </div>`;
          }
          return "";
        })
        .join("")}`;

    host.querySelector("[data-offline-pack]")?.addEventListener("click", () => {
      toast("OH / WV offline pack cached locally (demo)", "success");
    });
    host.querySelector("[data-intel-sync]")?.addEventListener("click", () => {
      toast("Camera intel refreshed (demo feed)", "success");
    });
    host.querySelector("[data-nav-start]")?.addEventListener("click", () => {
      toast("Turn-by-turn privacy nav armed (demo)", "success");
    });
  }

  // ── Unlock modal ─────────────────────────────────────────────────────────

  function openUnlockModal(featureId) {
    activeFeatureId = featureId;
    const modal = $("premium-modal");
    const body = $("premium-modal-body");
    const title = $("premium-modal-title");
    if (!modal || !body) return;

    const feature = Premium.FEATURES[featureId];
    if (!feature) return;

    const unlock = Premium.getUnlock(featureId);
    const adCheck = Premium.canWatchRewarded(featureId);
    title.textContent = feature.name;

    if (unlock.unlocked && unlock.permanent) {
      body.innerHTML = `
        <p class="text-sm text-flock-dim">${escapeHtml(feature.description)}</p>
        <div class="rounded-xl border border-flock-accent/30 bg-flock-accent/10 px-3 py-3">
          <p class="text-sm font-medium text-flock-accent">Permanently unlocked</p>
          <p class="text-xs text-flock-muted mt-1">Method: ${escapeHtml(unlock.method || "purchase")}</p>
        </div>
        <button type="button" class="btn-secondary w-full text-xs" data-close-premium>Done</button>`;
    } else {
      const tempNote = unlock.unlocked
        ? `<p class="text-xs text-flock-warn">Currently active via ad · ${escapeHtml(Premium.formatExpiry(unlock.expiresAt) || "")}</p>`
        : "";

      body.innerHTML = `
        <p class="text-sm text-flock-dim">${escapeHtml(feature.description)}</p>
        ${tempNote}
        <div class="space-y-2">
          <button type="button" id="btn-watch-ad" class="unlock-option" ${adCheck.ok ? "" : "disabled"}>
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-flock-warn/10 text-flock-warn">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3l14 9-14 9V3z"/></svg>
              </div>
              <div class="min-w-0 flex-1 text-left">
                <p class="text-sm font-medium">Watch rewarded ad</p>
                <p class="text-xs text-flock-muted mt-0.5">
                  Free · ${Math.round((AppConfig.ads.rewardTtlMs || 86400000) / 3600000)}h unlock
                  ${adCheck.ok ? ` · ${adCheck.remaining} left today` : ""}
                </p>
                ${!adCheck.ok ? `<p class="text-[11px] text-flock-danger mt-1">${escapeHtml(adCheck.reason)}</p>` : ""}
              </div>
            </div>
          </button>

          <button type="button" id="btn-stripe-buy" class="unlock-option unlock-option--stripe">
            <div class="flex items-start gap-3">
              <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#635bff]/15 text-[#635bff]">
                <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M13.976 9.15c-2.172-.806-3.356-1.426-3.356-2.409 0-.831.683-1.305 1.901-1.305 2.227 0 4.515.858 6.09 1.631l.89-5.494C18.252.975 15.697 0 12.165 0 9.667 0 7.589.654 6.104 1.872 4.56 3.147 3.757 4.992 3.757 7.218c0 4.039 2.467 5.76 6.476 7.219 2.585.92 3.445 1.574 3.445 2.583 0 .98-.84 1.545-2.354 1.545-1.875 0-4.965-.921-6.99-2.109l-.9 5.555C5.175 22.99 8.385 24 11.714 24c2.641 0 4.843-.624 6.328-1.813 1.664-1.305 2.525-3.236 2.525-5.732 0-4.128-2.524-5.851-6.591-7.305h.000z"/></svg>
              </div>
              <div class="min-w-0 flex-1 text-left">
                <p class="text-sm font-medium">Buy one-time unlock</p>
                <p class="text-xs text-flock-muted mt-0.5">Stripe Checkout · permanent · ${priceLabel(featureId)}</p>
              </div>
            </div>
          </button>
        </div>
        <p class="text-[10px] text-flock-muted leading-relaxed">
          Unlocks are stored on this device only. Ad rewards are simulated until a real ad network is wired in.
        </p>`;

      body.querySelector("#btn-watch-ad")?.addEventListener("click", () => {
        if (!adCheck.ok) return;
        closePremiumModal();
        startRewardedAd(featureId);
      });
      body.querySelector("#btn-stripe-buy")?.addEventListener("click", () => {
        closePremiumModal();
        beginCheckout(featureId);
      });
    }

    body.querySelectorAll("[data-close-premium]").forEach((el) => {
      el.addEventListener("click", closePremiumModal);
    });

    modal.hidden = false;
  }

  function closePremiumModal() {
    const modal = $("premium-modal");
    if (modal) modal.hidden = true;
  }

  // ── Rewarded ad UI ───────────────────────────────────────────────────────

  function startRewardedAd(featureId) {
    const modal = $("ad-modal");
    const bar = $("ad-progress-bar");
    const status = $("ad-status");
    const countdown = $("ad-countdown");
    const claim = $("btn-ad-claim");
    const cancel = $("btn-ad-cancel");
    const sub = $("ad-modal-sub");

    if (!modal) return;

    activeFeatureId = featureId;
    const feature = Premium.FEATURES[featureId];
    const duration = AppConfig.ads.rewardDurationSec || 12;

    if (sub) {
      sub.textContent = `Unlock “${feature?.name || featureId}” for ${Math.round((AppConfig.ads.rewardTtlMs || 86400000) / 3600000)} hours.`;
    }
    if (claim) {
      claim.disabled = true;
      claim.textContent = "Claim reward";
    }
    if (bar) bar.style.width = "0%";
    if (status) status.textContent = `${AppConfig.ads.networkLabel}…`;
    if (countdown) countdown.textContent = `${duration}s`;

    modal.hidden = false;

    if (adAbort) adAbort.abort();
    adAbort = new AbortController();

    let completed = false;
    const claimBtn = $("btn-ad-claim");
    const cancelBtn = $("btn-ad-cancel");

    const onClaim = () => {
      if (!completed) return;
      closeAdModal();
      renderFeatureList();
      toast(
        `${feature?.name || "Feature"} unlocked for ${Math.round((AppConfig.ads.rewardTtlMs || 86400000) / 3600000)}h`,
        "success"
      );
    };

    const onCancel = () => {
      adAbort?.abort();
      closeAdModal();
    };

    // Fresh listeners each open
    claimBtn?.removeEventListener("click", claimBtn._fdClaim);
    cancelBtn?.removeEventListener("click", cancelBtn._fdCancel);
    if (claimBtn) {
      claimBtn._fdClaim = onClaim;
      claimBtn.addEventListener("click", onClaim);
    }
    if (cancelBtn) {
      cancelBtn._fdCancel = onCancel;
      cancelBtn.addEventListener("click", onCancel);
    }

    Premium.watchRewardedAd(featureId, {
      signal: adAbort.signal,
      onProgress(p) {
        const barEl = $("ad-progress-bar");
        const statusEl = $("ad-status");
        const countEl = $("ad-countdown");
        if (barEl) barEl.style.width = `${Math.round(p * 100)}%`;
        const left = Math.max(0, Math.ceil(duration * (1 - p)));
        if (countEl) countEl.textContent = left > 0 ? `${left}s` : "0s";
        if (statusEl) statusEl.textContent = p < 1 ? "Watching ad…" : "Reward ready";
      },
    })
      .then((result) => {
        completed = result.completed;
        if (result.completed) {
          const c = $("btn-ad-claim");
          if (c) {
            c.disabled = false;
            c.textContent = "Claim reward";
          }
          const statusEl = $("ad-status");
          if (statusEl) statusEl.textContent = "Reward earned";
          renderFeatureList(); // unlock already applied by Premium.watchRewardedAd
        } else {
          closeAdModal();
          toast("Ad cancelled — no unlock", "error");
        }
      })
      .catch((err) => {
        closeAdModal();
        toast(err.message || "Ad failed", "error");
      });
  }

  function closeAdModal() {
    const modal = $("ad-modal");
    if (modal) modal.hidden = true;
  }

  // ── Stripe checkout ──────────────────────────────────────────────────────

  async function beginCheckout(featureId) {
    try {
      const result = await Premium.startCheckout(featureId);
      if (result.method === "demo") {
        openStripeDemo(featureId);
        return;
      }
      // payment_link / checkout_session navigate away
    } catch (err) {
      toast(err.message || "Checkout failed", "error");
    }
  }

  function openStripeDemo(featureId) {
    demoFeatureId = featureId;
    const modal = $("stripe-demo-modal");
    const item = $("stripe-demo-item");
    const price = $("stripe-demo-price");
    const desc = $("stripe-demo-desc");

    const name =
      featureId === Premium.BUNDLE_ID
        ? "Full premium bundle"
        : Premium.FEATURES[featureId]?.name || featureId;

    if (item) item.textContent = name;
    if (price) price.textContent = priceLabel(featureId);
    if (desc) {
      desc.textContent = `Demo Checkout for “${name}”. No card is charged. Configure Stripe in js/config.js for live payments.`;
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
    const name =
      id === Premium.BUNDLE_ID ? "All premium features" : Premium.FEATURES[id]?.name || id;
    toast(`${name} permanently unlocked (demo)`, "success");
  }

  // ── Wire up ──────────────────────────────────────────────────────────────

  function init() {
    renderFeatureList();

    $("btn-premium")?.addEventListener("click", () => {
      // Open first locked feature, or offline manage
      const locked = Premium.listFeatures().find((f) => !Premium.getUnlock(f.id).permanent);
      openUnlockModal(locked?.id || "offline");
    });
    $("btn-premium-open")?.addEventListener("click", () => openUnlockModal("offline"));
    $("btn-buy-bundle")?.addEventListener("click", () => {
      if (Premium.listFeatures().every((f) => Premium.getUnlock(f.id).permanent)) return;
      beginCheckout(Premium.BUNDLE_ID);
    });

    document.querySelectorAll("[data-close-premium]").forEach((el) => {
      el.addEventListener("click", closePremiumModal);
    });
    document.querySelectorAll("[data-close-stripe-demo]").forEach((el) => {
      el.addEventListener("click", closeStripeDemo);
    });
    $("btn-stripe-demo-pay")?.addEventListener("click", confirmStripeDemo);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closePremiumModal();
        closeStripeDemo();
        if (!$("ad-modal")?.hidden) {
          adAbort?.abort();
          closeAdModal();
        }
      }
    });

    Premium.onChange(() => renderFeatureList());

    // Stripe return handling (defer toast so app.js can register __flockToast)
    const ret = Premium.handleCheckoutReturn();
    if (ret?.status === "success") {
      renderFeatureList();
      const name =
        ret.featureId === Premium.BUNDLE_ID
          ? "Premium bundle"
          : Premium.FEATURES[ret.featureId]?.name || "Feature";
      setTimeout(
        () => toast(`${name} unlocked — thanks for supporting privacy tools`, "success"),
        50
      );
    } else if (ret?.status === "cancel") {
      setTimeout(() => toast("Checkout cancelled", "error"), 50);
    }
  }

  return { init, openUnlockModal, renderFeatureList, beginCheckout };
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
