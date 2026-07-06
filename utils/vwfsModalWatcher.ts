const VWFS_SURFACE_SELECTOR = [
  "#bvfs-yield .BvfsSimulationContainer",
  "#bvfs-yield .BvfsLightbox",
  "#bvfs-yield .Loading--overlay",
  "#bvfs-yield [class*='BvfsSimulationContainer']",
  "#bvfs-yield [class*='BvfsLightbox']",
  "#bvfs-yield [class*='Guide__']",
  "#bvfs-yield [class*='TourPopup']"
].join(", ");
const CLOSE_SETTLE_MS = 900;
const OPEN_TIMEOUT_MS = 120000;

function isVisibleElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) return false;

  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return false;

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function hasVisibleVwfsSurface(): boolean {
  if (typeof document === "undefined") return false;
  return Array.from(document.querySelectorAll(VWFS_SURFACE_SELECTOR)).some(isVisibleElement);
}

type WatchVwfsSimulatorCloseOptions = {
  assumeOpened?: boolean;
};

export function watchVwfsSimulatorClose(onClose: () => void, options: WatchVwfsSimulatorCloseOptions = {}): () => void {
  if (typeof document === "undefined" || typeof window === "undefined") return () => {};

  let hasOpened = Boolean(options.assumeOpened);
  let didClose = false;
  let closeTimer: number | null = null;
  let openTimeoutId: number | null = null;

  const clearCloseTimer = () => {
    if (closeTimer === null) return;
    window.clearTimeout(closeTimer);
    closeTimer = null;
  };

  const cleanup = () => {
    clearCloseTimer();
    if (openTimeoutId !== null) {
      window.clearTimeout(openTimeoutId);
      openTimeoutId = null;
    }
    observer.disconnect();
  };

  const finish = () => {
    if (didClose) return;
    didClose = true;
    cleanup();
    onClose();
  };

  const check = () => {
    const hasSurface = hasVisibleVwfsSurface();

    if (hasSurface) {
      hasOpened = true;
      if (openTimeoutId !== null) {
        window.clearTimeout(openTimeoutId);
        openTimeoutId = null;
      }
      clearCloseTimer();
      return;
    }

    if (!hasOpened || didClose || closeTimer !== null) return;

    closeTimer = window.setTimeout(() => {
      closeTimer = null;
      if (hasOpened && !hasVisibleVwfsSurface()) finish();
    }, CLOSE_SETTLE_MS);
  };

  const observer = new MutationObserver(check);
  if (!hasOpened) {
    openTimeoutId = window.setTimeout(() => {
      openTimeoutId = null;
      if (!hasOpened) cleanup();
    }, OPEN_TIMEOUT_MS);
  }

  observer.observe(document.body, {
    attributes: true,
    attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    childList: true,
    subtree: true
  });

  window.setTimeout(check, 50);

  return cleanup;
}
