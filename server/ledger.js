// The dedicated database contains counts and anonymous receipt IDs only.
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { firstDay, gaDay, policy, tools } from './policy.js';

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
    async settledThrough() {
      return (await root.get()).data()?.settledThrough || null;
    },
    async markSettled(day) {
      await db.runTransaction(async tx => {
        const previous = (await tx.get(root)).data()?.settledThrough;
        if (!previous || previous < day) tx.set(root, { settledThrough: day }, { merge: true });
      });
    },
    async record(id, eventId, kind, now = new Date()) {
      const day = gaDay(now, config.zone);
      if (day < (kind === 'views' ? firstDay : config.start)) return;
      await db.runTransaction(async tx => {
        const receipt = receipts.doc(eventId);
        const bucket = days.doc(day);
        const [seen, current] = await tx.getAll(receipt, bucket);
        if (seen.exists) return;
        tx.create(receipt, { day, expiresAt: new Date(now.getTime() + 7 * 86400000) });
        tx.set(bucket, { [kind]: { [id]: FieldValue.increment(1) } }, { merge: true });
        const alreadySettled = kind === 'views' && current.data()?.settledViews;
        if (kind !== 'copyOpens' && !alreadySettled) {
          tx.set(root, { counts: { [id]: FieldValue.increment(1) } }, { merge: true });
        }
      });
    },
    async settle(day, values) {
      // Store the authoritative GA day and only apply its difference to the total.
      // This transaction also serializes a live write concurrent with reconciliation.
      await db.runTransaction(async tx => {
        const bucket = days.doc(day);
        const current = (await tx.get(bucket)).data() || {};
        const previous = current.settledViews ?? current.views ?? {};
        const changes = {};
        for (const [id] of tools) {
          const diff = (values[id] || 0) - (previous[id] || 0);
          if (diff) changes[id] = FieldValue.increment(diff);
        }
        tx.set(bucket, { settledViews: values }, { mergeFields: ['settledViews'] });
        if (Object.keys(changes).length) tx.set(root, { counts: changes }, { merge: true });
      });
    },
    async totals() {
      const totals = baselineCounts();
      const deltas = (await root.get()).data()?.counts || {};
      for (const id of Object.keys(totals)) totals[id] += deltas[id] || 0;
      return totals;
    }
  };
}
export function baselineCounts() {
  return Object.fromEntries(Object.entries(policy.resources).filter(([, p]) => !p.aliasOf)
    .map(([id, p]) => [id, p.baseline || 0]));
}
