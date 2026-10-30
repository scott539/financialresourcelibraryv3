// The dedicated database contains counts and anonymous receipt IDs only.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { files, firstDay, gaDay, policy, tools } from './policy.js';

export function settings() {
  const { BPM_METRICS_GOOGLE_JSON, BPM_METRICS_DATABASE, BPM_GA_TIMEZONE, BPM_DOWNLOAD_START } = process.env;
  if (!BPM_METRICS_GOOGLE_JSON || !BPM_GA_TIMEZONE || !BPM_METRICS_DATABASE ||
      BPM_METRICS_DATABASE === '(default)' || !/^\d{4}-\d{2}-\d{2}$/.test(BPM_DOWNLOAD_START || '')) return null;
  // Preview and production never share data, even when using the same service identity.
  return { credential: JSON.parse(BPM_METRICS_GOOGLE_JSON), database: BPM_METRICS_DATABASE,
    zone: BPM_GA_TIMEZONE, start: BPM_DOWNLOAD_START,
    collection: process.env.VERCEL_ENV === 'production' ? 'publishedMetrics' : 'previewMetrics' };
}

export function ledger(config) {
  const app = getApps().find(a => a.name === 'usage') || initializeApp({ credential: cert(config.credential) }, 'usage');
  const db = getFirestore(app, config.database);
  const root = db.collection(config.collection).doc('library');
  const days = root.collection('days');
  const receipts = root.collection('receipts');
  return {
    async record(id, eventId, kind, now = new Date()) {
      const day = gaDay(now, config.zone);
      if (day < (kind === 'views' ? firstDay : config.start)) return;
      await db.runTransaction(async tx => {
        const receipt = receipts.doc(eventId);
        if ((await tx.get(receipt)).exists) return;
        tx.create(receipt, { day, expiresAt: new Date(now.getTime() + 7 * 86400000) });
        tx.set(days.doc(day), { [kind]: { [id]: FieldValue.increment(1) } }, { merge: true });
      });
    },
    async settle(day, values) {
      // Replace the GA bucket, including zeros. Leave the download ledger alone.
      await days.doc(day).set({ settledViews: values }, { mergeFields: ['settledViews'] });
    },
    async totals() {
      const counts = baselineCounts();
      const docs = await days.where('__name__', '>=', firstDay).get();
      for (const doc of docs.docs) {
        const d = doc.data();
        for (const [id] of tools) counts[id] += (d.settledViews ?? d.views)?.[id] || 0;
        if (doc.id >= config.start) for (const [id] of files) counts[id] += d.downloads?.[id] || 0;
      }
      return counts;
    }
  };
}
export function baselineCounts() {
  return Object.fromEntries(Object.entries(policy.resources).filter(([, p]) => !p.aliasOf)
    .map(([id, p]) => [id, p.baseline || 0]));
}
