import { withVercelIdentity } from '../server/google-identity.js';
import { catalogTotals, ledger, settings } from '../server/ledger.js';
import { isUUID, publicHosts, toolForPath } from '../server/policy.js';

async function handler(req, res) {
  const config = settings();
  if (req.method === 'GET') {
    res.setHeader('Cache-Control', 'private, no-store');
    try {
      if (config) {
        const totals = await ledger(config).totals();
        res.setHeader('Vercel-CDN-Cache-Control', 's-maxage=3');
        return res.json({ ...totals, since: config.start, live: true });
      }
    } catch { /* Always retain the verified baseline if the counter store is offline. */ }
    return res.json({ ...catalogTotals(), since: null, live: false });
  }
  const origin = req.headers.origin;
  if (!publicHosts.some(h => origin === 'https://' + h)) return res.status(403).end();
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }
  if (req.method !== 'POST') return res.status(405).end();
  if (!config) return res.status(503).end();
  const { path, eventId } = req.body || {};
  const id = typeof path === 'string' && path.length <= 120 && toolForPath(path);
  if (!id || !isUUID(eventId)) return res.status(400).end();
  await ledger(config).record(id, eventId, 'views');
  return res.status(204).end();
}

export default withVercelIdentity(handler);
