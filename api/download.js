import { isUUID } from '../server/policy.js';
import { ledger, settings } from '../server/ledger.js';
import { sourceFile, verifiedFile } from '../server/files.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (req.method !== 'GET') return res.status(405).end();
  const { id, receipt, measure, source } = req.query;
  const file = typeof id === 'string' && await sourceFile(id, source);
  if (!file) return res.status(404).send('File unavailable');
  const data = file.binary && await verifiedFile(file).catch(() => null);
  if (!data) return res.redirect(302, file.url);
  if (measure === '1' && isUUID(receipt)) {
    try {
      const config = settings();
      if (config) await ledger(config).record(id, receipt, 'downloads');
    } catch { console.error('Resource usage could not be recorded'); }
  }
  res.setHeader('Content-Type', data.type);
  const name = (file.filename || 'download').replace(/[^\x20-\x7E]|["\\/]/g, '_');
  res.setHeader('Content-Disposition', 'attachment; filename="' + name + '"');
  return res.status(200).send(data.bytes);
}
