import { isUUID, policy } from '../server/policy.js';
import { ledger, settings } from '../server/ledger.js';

export default async function handler(req,res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (req.headers.origin !== 'https://' + req.headers.host) return res.status(403).end();
  const {id,eventId} = req.body || {};
  if (policy.resources[id]?.kind !== 'downloads' || !isUUID(eventId)) return res.status(400).end();
  const config = settings();
  if (!config) return res.status(503).end();
  await ledger(config).record(id,eventId,'copyOpens');
  return res.status(204).end();
}
