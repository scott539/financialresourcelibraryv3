import { readFileSync } from 'node:fs';

export const policy = JSON.parse(readFileSync(new URL('../data/usage-policy.json', import.meta.url)));
export const firstDay = '2026-10-30';
export const publicHosts = ['biggerpocketsmoney.com', 'www.biggerpocketsmoney.com'];
export const files = Object.entries(policy.resources).filter(([, item]) => item.kind === 'downloads');
export const tools = Object.entries(policy.resources).filter(([, item]) => item.kind === 'views');

export function toolForPath(path) {
  const slug = path.toLowerCase().replace(/^\/+|\/+$/g, '');
  return tools.find(([, tool]) => tool.paths.includes(slug))?.[0];
}

export function gaDay(now, zone) {
  // ISO calendar day in the GA property's reporting timezone.
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

export function isUUID(value) {
  return typeof value === 'string' && /^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value);
}
