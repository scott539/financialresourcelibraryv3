// A complete GA day replaces its provisional views. Re-reading the window also
// picks up late events, restores missed jobs and safely backfills from Oct 30.
import { GoogleAuth } from 'google-auth-library';
import { timingSafeEqual } from 'node:crypto';
import { firstDay, gaDay, publicHosts, toolForPath, tools } from '../server/policy.js';
import { ledger, settings } from '../server/ledger.js';

export default async function handler(req, res) {
  const expected = Buffer.from('Bearer ' + (process.env.CRON_SECRET || ''));
  const provided = Buffer.from(req.headers.authorization || '');
  if (req.method !== 'GET' || !process.env.CRON_SECRET || expected.length !== provided.length ||
      !timingSafeEqual(expected, provided)) return res.status(401).end();
  const config = settings();
  if (!config) return res.status(503).end();
  const today = gaDay(new Date(), config.zone);
  const endDate = new Date(Date.parse(today) - 86400000).toISOString().slice(0, 10);
  if (endDate < firstDay) return res.json({ days: 0 });
  const auth = new GoogleAuth({ credentials: config.credential, scopes: ['https://www.googleapis.com/auth/analytics.readonly'] });
  const client = await auth.getClient();
  const days = new Map();
  for (let day = Date.parse(firstDay); day <= Date.parse(endDate); day += 86400000) {
    days.set(new Date(day).toISOString().slice(0,10), Object.fromEntries(tools.map(([id]) => [id, 0])));
  }
  const filters = [
    { filter: { fieldName: 'hostName', inListFilter: { values: publicHosts } } },
    { filter: { fieldName: 'pagePath', stringFilter: { matchType: 'FULL_REGEXP',
      value: '^/(' + tools.flatMap(([, t]) => t.paths).join('|') + ')/?$', caseSensitive: false } } },
    { notExpression: { filter: { fieldName: 'pageTitle', stringFilter: { matchType: 'CONTAINS', value: 'not found', caseSensitive: false } } } }
  ];
  const query = { dateRanges: [{ startDate: firstDay, endDate }], dimensions: [{name:'date'},{name:'pagePath'}],
    metrics: [{name:'screenPageViews'}], dimensionFilter: { andGroup: { expressions: filters } }, limit: 10000 };
  let offset = 0;
  do {
    const { data } = await client.request({ method:'POST',
      url:'https://analyticsdata.googleapis.com/v1beta/properties/499203875:runReport', data:{ ...query, offset } });
    if (data.metadata?.timeZone !== config.zone || data.metadata?.subjectToThresholding || data.metadata?.dataLossFromOtherRow)
      throw new Error('Report timezone or coverage requires review');
    for (const row of data.rows || []) {
      const [date, path] = row.dimensionValues.map(d => d.value);
      const key = date.replace(/^(\d{4})(\d{2})(\d{2})$/, '$1-$2-$3');
      const id = toolForPath(path);
      if (id) days.get(key)[id] += Number(row.metricValues[0].value);
    }
    offset += data.rows?.length || 0;
    if (offset >= (data.rowCount || 0)) break;
    if (!data.rows?.length) throw new Error('Incomplete GA4 report');
  } while (true);
  const store = ledger(config);
  for (const [day, values] of days) await store.settle(day, values);
  res.json({ days: days.size, through: endDate });
}
