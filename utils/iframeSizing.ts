// The document's scrollHeight is at least the iframe viewport height. Measuring
// it feeds the host's last height back into the next request and prevents shrink.
export function measureIframeContent(root: HTMLElement | null): number {
  if (!root) return 0;
  const bounds = root.getBoundingClientRect();
  return Math.ceil(Math.max(root.scrollHeight, root.offsetHeight, bounds.height)) + 2;
}
