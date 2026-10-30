// The dedicated database contains counts and anonymous receipt IDs only.
import { FieldValue, Firestore } from '@google-cloud/firestore';
import { GoogleAuth } from 'google-auth-library';
import { googleClient, projectId } from './google-identity.js';
import { firstDay, gaDay, policy, tools } from './policy.js';

export function settings() {
  const { BPM_GCP_WIF_PROVIDER: provider, BPM_METRICS_DATABASE: database, BPM_GA_TIMEZONE: zone, BPM_DOWNLOAD_START: start } = process.env;
  if (process.env.VERCEL_ENV !== 'production' || database !== 'bpm-resource-metrics' || !zone ||
      !/^projects\/\d+\/locations\/global\/workloadIdentityPools\/[a-z0-9-]+\/providers\/[a-z0-9-]+$/.test(provider || '') ||
      !/^\d{4}-\d{2}-\d{2}$/.test(start || '')) return null;
  return { provider, database, zone, start };
}

let db;
export function ledger(config) {
  db ??= new Firestore({ projectId, databaseId: config.database,
    auth: new GoogleAuth({ projectId, authClient: googleClient(config.provider, 'https://www.googleapis.com/auth/datastore') }) });
  const root = db.collection('publishedMetrics').doc('library');
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
          tx.set(root, { [kind]: { [id]: FieldValue.increment(1) } }, { merge: true });
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
        if (Object.keys(changes).length) tx.set(root, { views: changes }, { merge: true });
      });
    },
    async totals() {
      return catalogTotals((await root.get()).data());
    }
  };
}
export function catalogTotals(root = {}) {
  const counts = {};
  const rankCounts = {};
  for (const [id, resource] of Object.entries(policy.resources)) {
    if (resource.aliasOf) continue;
    // Previous ledger versions recorded only the resource's eligible metric.
    const prior = (resource.baseline ?? 0) + (root.counts?.[id] ?? 0);
    const views = (root.views?.[id] ?? 0) + (resource.kind === 'views' ? prior : 0);
    const downloads = (root.downloads?.[id] ?? 0) + (resource.kind === 'downloads' ? prior : 0);
    counts[id] = resource.kind === 'views' ? views : downloads;
    rankCounts[id] = Math.max(views, downloads);
  }
  return { counts, rankCounts };
}
