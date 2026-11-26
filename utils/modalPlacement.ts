// The library runs inside a tall iframe whose height matches its content, so the
// host page scrolls and the iframe's own viewport is the whole document. A
// position:fixed panel therefore centers in the middle of the catalog, far from
// the visitor. These helpers place the panel in document coordinates instead.

export interface ModalPlacementInput {
  /** Document Y of the control the visitor tapped, if known. */
  anchorY: number | null;
  /** Document Y range of the iframe that is visible on screen, if known. */
  visibleTop: number | null;
  visibleBottom: number | null;
  panelHeight: number;
  docHeight: number;
  margin?: number;
}

export function placeModal({ anchorY, visibleTop, visibleBottom, panelHeight, docHeight, margin = 16 }: ModalPlacementInput): number {
  const hasVisible = visibleTop !== null && visibleBottom !== null && visibleBottom - visibleTop > 120;
  let top: number;
  if (anchorY !== null && Number.isFinite(anchorY)) top = anchorY - panelHeight / 2;
  else if (hasVisible) top = visibleTop! + (visibleBottom! - visibleTop! - panelHeight) / 2;
  else top = margin;

  if (hasVisible) {
    const min = visibleTop! + margin;
    const max = Math.max(min, visibleBottom! - panelHeight - margin);
    top = Math.min(Math.max(top, min), max);
  }
  const docMax = Math.max(margin, docHeight - panelHeight - margin);
  return Math.round(Math.min(Math.max(top, margin), docMax));
}

let lastAnchorY: number | null = null;
let lastAnchorAt = 0;

function rememberAnchor(event: Event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target) return;
  const control = target.closest('button, a, [role="button"]') || target;
  const rect = control.getBoundingClientRect();
  lastAnchorY = rect.top + rect.height / 2 + window.scrollY;
  lastAnchorAt = Date.now();
}

if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', rememberAnchor, { capture: true, passive: true });
  document.addEventListener('click', rememberAnchor, { capture: true, passive: true });
}

/** Document Y of the most recent tap or click, if it happened in the last few seconds. */
export function recentAnchorY(maxAgeMs = 5000): number | null {
  return lastAnchorY !== null && Date.now() - lastAnchorAt <= maxAgeMs ? lastAnchorY : null;
}

/**
 * Reports the document Y range of this frame that is on screen. Inside a
 * cross-origin iframe the IntersectionObserver clips to the top-level viewport,
 * which is the only way the frame can learn where the visitor is looking.
 */
export function observeVisibleRange(onRange: (top: number, bottom: number) => void): () => void {
  if (window.self === window.top) {
    const report = () => onRange(window.scrollY, window.scrollY + window.innerHeight);
    report();
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }
  if (typeof IntersectionObserver === 'undefined') return () => {};
  const thresholds = Array.from({ length: 101 }, (_, i) => i / 100);
  const observer = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1];
    const rect = entry?.intersectionRect;
    if (!rect || rect.height <= 0) return;
    onRange(rect.top + window.scrollY, rect.bottom + window.scrollY);
  }, { threshold: thresholds });
  observer.observe(document.documentElement);
  return () => observer.disconnect();
}
