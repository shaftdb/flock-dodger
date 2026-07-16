/**
 * PWA registration + install prompt handling.
 */

const PWA = (() => {
  let deferredPrompt = null;
  let installed = false;

  function init({ onPromptAvailable, onInstalled } = {}) {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("./sw.js")
          .then((reg) => {
            console.info("[PWA] SW registered", reg.scope);
          })
          .catch((err) => {
            console.warn("[PWA] SW registration failed", err);
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

    // Standalone detection
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

  return { init, promptInstall, canInstall, isInstalled };
})();
