// Publish only token-free paths for known library assets so qualifying links on
// podcast and article pages use the same download handler as catalog cards.
import { policy } from '../server/policy.js';

export default async function handler(req,res) {
  if (req.method !== 'GET') return res.status(405).end();
  const links = Object.create(null);
  const base = 'https://firestore.googleapis.com/v1/projects/bp-money-resources/databases/(default)/documents/resources';
  let token;
  do {
    const url = new URL(base);
    url.searchParams.set('pageSize','100');
    for (const field of ['fileUrl','isHidden','isComingSoon']) url.searchParams.append('mask.fieldPaths',field);
    if (token) url.searchParams.set('pageToken',token);
    const response = await fetch(url,{signal:AbortSignal.timeout(10000)});
    if (!response.ok) return res.status(503).end();
    const data = await response.json();
    for (const doc of data.documents || []) {
      const id = doc.name.split('/').pop(), fields = doc.fields || {};
      if (policy.resources[id]?.kind !== 'downloads' || fields.isHidden?.booleanValue || fields.isComingSoon?.booleanValue) continue;
      const raw = fields.fileUrl?.stringValue;
      if (!raw?.startsWith('https://firebasestorage.googleapis.com/v0/b/bp-money-resources.firebasestorage.app/o/')) continue;
      const path = new URL(raw).pathname;
      // Sharing an asset between two records makes the attribution ambiguous.
      links[path] = Object.hasOwn(links,path) && links[path] !== id ? null : id;
    }
    token = data.nextPageToken;
  } while (token);
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Cache-Control','public, s-maxage=300');
  return res.json(links);
}
