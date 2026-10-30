// A new receipt belongs to one requested file, never to a person or browser.
// Explicit consent denials and preview activity remain unmeasured.
export function downloadUrl(id: string, consent: boolean | null, preview = false): string {
  const query = new URLSearchParams({
    id,
    receipt: crypto.randomUUID(),
    measure: !preview && consent !== false ? '1' : '0'
  });
  return '/api/download?' + query;
}
