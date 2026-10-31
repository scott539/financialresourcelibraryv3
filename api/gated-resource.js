import { authorizeGate, gateEnabled, tagGateAction } from '../server/kit-gate.js';
import { sourceFile, verifiedFile } from '../server/files.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control','private, no-store');
  if (!gateEnabled()) return res.status(404).end();
  if (req.method !== 'POST') return res.status(405).end();
  const { id, action } = req.body || {};
  const token = (req.headers.authorization || '').replace(/^Bearer /,'');
  let subscriberId;
  try { subscriberId = await authorizeGate({token, id, action}); }
  catch { return res.status(401).json({error:'Please verify your test subscription to continue.'}); }
  if (action === 'copyOpens') {
    const response = await fetch('https://firestore.googleapis.com/v1/projects/bp-money-resources/databases/(default)/documents/resources/' + encodeURIComponent(id));
    if (!response.ok) return res.status(404).end();
    const fields = (await response.json()).fields || {};
    if (fields.isComingSoon?.booleanValue || fields.isHidden?.booleanValue) return res.status(404).end();
    const raw = fields.googleDriveUrl?.stringValue || fields.fileUrl?.stringValue;
    let url;
    try { url = new URL(raw); } catch { return res.status(404).end(); }
    if (url.protocol !== 'https:' || url.hostname !== 'docs.google.com' || url.username || url.password || !/\/copy\/?$/.test(url.pathname)) return res.status(404).end();
    // This records the request for Google's copy dialog, never a completed copy.
    let tagged = true;
    try { await tagGateAction({subscriberId,id,action}); } catch { tagged = false; }
    return res.status(200).json({url:url.href, tagged});
  }
  const file = await sourceFile(id);
  const data = file?.binary && await verifiedFile(file).catch(()=>null);
  // No blind redirect: tag only files actually fetched and verified for delivery.
  if (!data) return res.status(503).json({error:'This file could not be verified for the test. Please try another resource.'});
  let tagged = true;
  try { await tagGateAction({subscriberId,id,action}); } catch { tagged = false; }
  res.setHeader('X-BPM-Test-Tagged', tagged ? '1' : '0');
  res.setHeader('Content-Type',data.type);
  const name = (file.filename || 'download').replace(/[^\x20-\x7E]|["\\/]/g,'_');
  res.setHeader('Content-Disposition','attachment; filename="'+name+'"');
  // Preview activity deliberately never modifies the production usage ledger.
  return res.status(200).send(data.bytes);
}
