/**
 * PWA registration + install prompt handling.
 * Forces service-worker updates and reloads when a new shell ships
 * (phones often ignore "hard refresh" under an old SW cache).
 */

// Bump when shipping HTML/CSS/JS so registration re-fetches sw.js
const CACHE_BUST = "2-mobile-sheet";

const PWA = (() => {
  let deferredPrompt = null;
  let installed = false;
  let reloading = false;

  async function clearAllCaches() {
    if (!("caches" in window)) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  async function unregisterAllWorkers() {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  /** Full reset: wipe caches + SW, then reload. Use when stuck on an old build. */
  async function forceUpdate() {
    try {
      await unregisterAllWorkers();
      await clearAllCaches();
    } catch (e) {
      console.warn("[PWA] forceUpdate failed", e);
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("force-update");
    url.searchParams.set("v", String(Date.now()));
    window.location.replace(url.toString());
  }

  function showUpdateBanner() {
    if (document.getElementById("pwa-update-banner")) return;
    const el = document.createElement("div");
    el.id = "pwa-update-banner";
    el.setAttribute("role", "status");
    el.className = "fixed inset-x-0 bottom-0 z-[9999] p-3 sm:p-4 pointer-events-none";
    el.innerHTML = `
      <div class="pointer-events-auto mx-auto max-w-md rounded-2xl border border-flock-accent/40 bg-flock-surface px-4 py-3 shadow-glow flex items-center gap-3">
        <div class="min-w-0 flex-1">
          <p class="text-sm font-semibold text-flock-text">New version ready</p>
          <p class="text-xs text-flock-muted">Tap reload for the mobile map layout</p>
        </div>
        <button type="button" id="pwa-update-btn"
          class="shrink-0 rounded-xl bg-flock-accent px-3 py-2 text-xs font-semibold text-flock-bg">
          Reload
        </button>
      </div>`;
    document.body.appendChild(el);
    document.getElementById("pwa-update-btn")?.addEventListener("click", () => {
      forceUpdate();
    });
  }

  function init({ onPromptAvailable, onInstalled } = {}) {
    // Escape hatch: open site with ?force-update=1 on a stuck phone
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("force-update") === "1") {
        forceUpdate();
        return;
      }
    } catch {
      /* ignore */
    }

    if ("serviceWorker" in navigator) {
      const hadController = Boolean(navigator.serviceWorker.controller);

      window.addEventListener("load", () => {
        const swUrl = `./sw.js?v=${CACHE_BUST}`;
        navigator.serviceWorker
          .register(swUrl)
          .then((reg) => {
            console.info("[PWA] SW registered", reg.scope);

            if (reg.waiting) {
              showUpdateBanner();
              reg.waiting.postMessage({ type: "SKIP_WAITING" });
            }

            reg.addEventListener("updatefound", () => {
              const worker = reg.installing;
              if (!worker) return;
              worker.addEventListener("statechange", () => {
                if (worker.state === "installed" && navigator.serviceWorker.controller) {
                  showUpdateBanner();
                  worker.postMessage({ type: "SKIP_WAITING" });
                }
              });
            });

            // Phones leave tabs open for days — recheck hourly
            setInterval(() => {
              reg.update().catch(() => {});
            }, 60 * 60 * 1000);
          })
          .catch((err) => {
            console.warn("[PWA] SW registration failed", err);
          });

        // When a *new* SW takes over an existing session, reload once
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (!hadController || reloading) return;
          reloading = true;
          window.location.reload();
        });
      });
    }

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (typeof onPromptAvailable === "function") onPromptAvailable(true);
    });

    window.addEventListener("appinstalled", () => {
      installed = true;
      deferredPrompt = null;
      if (typeof onInstalled === "function") onInstalled();
      if (typeof onPromptAvailable === "function") onPromptAvailable(false);
    });

    if (window.matchMedia("(display-mode: standalone)").matches || navigator.standalone) {
      installed = true;
    }
  }

  async function promptInstall() {
    if (!deferredPrompt) return { outcome: "unavailable" };
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    return choice;
  }

  function canInstall() {
    return Boolean(deferredPrompt) && !installed;
  }

  function isInstalled() {
    return installed;
  }

  return { init, promptInstall, canInstall, isInstalled, forceUpdate };
})();
