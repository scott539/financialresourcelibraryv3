import { policy } from './policy.js';

const project = 'bp-money-resources';
const bucket = 'bp-money-resources.firebasestorage.app';
const moneyDatePdf = 'https://temp-assets-dir.s3.amazonaws.com/money+date+template_v2.pdf';
const pfsId = '0y425w6qfHCnOnTfd0JC';

export async function sourceFile(id, source, request = fetch) {
  if (policy.resources[id]?.kind !== 'downloads') return null;
  if (id === 'cVIAlLn6rU7pIay6ge4C' && source === 'podcast-pdf') {
    return { url: moneyDatePdf, filename: 'Money Date Template.pdf', binary: true };
  }
  const result = await request('https://firestore.googleapis.com/v1/projects/' + project +
    '/databases/(default)/documents/resources/' + encodeURIComponent(id));
  if (!result.ok) return null;
  const fields = (await result.json()).fields || {};
  if (fields.isComingSoon?.booleanValue || fields.isHidden?.booleanValue) return null;
  const raw = fields.fileUrl?.stringValue || '';
  const name = fields.fileName?.stringValue || '';
  const url = safeUrl(raw);
  if (url?.hostname === 'firebasestorage.googleapis.com' &&
      url.pathname.startsWith('/v0/b/' + bucket + '/o/')) {
    return { url: url.href, filename: name || decodeURIComponent(url.pathname.split('/o/')[1]).split('/').pop(), binary: true };
  }
  // Requesting the workbook and opening Google's copy dialog are distinct actions.
  if (id === pfsId) {
    const sheet = safeUrl(fields.googleDriveUrl?.stringValue || raw);
    const match = sheet?.hostname === 'docs.google.com' && sheet.pathname.match(/^\/spreadsheets\/d\/([\w-]+)\//);
    if (match) return { url: 'https://docs.google.com/spreadsheets/d/' + match[1] + '/export?format=xlsx',
      filename: 'BiggerPockets Money Personal Financial Statement.xlsx', binary: true };
  }
  if (!url || !['biggerpocketsmoney.com','www.biggerpocketsmoney.com','docs.google.com','drive.google.com'].includes(url.hostname)) return null;
  return { url: url.href, filename: name, binary: false };
}
function safeUrl(raw) {
  try { const u = new URL(raw); return u.protocol === 'https:' && !u.username && !u.password ? u : null; }
  catch { return null; }
}
export async function verifiedFile(file, request = fetch) {
  // Larger files retain their original delivery route, without a fabricated count.
  const MAX = 4 * 1024 * 1024;
  const signal = AbortSignal.timeout(12000);
  let response = await request(file.url, { signal, redirect:'manual' });
  // Google Sheets public exports can redirect to a Google-owned download host.
  for (let i = 0; i < 3 && [301,302,303,307,308].includes(response.status); i++) {
    const redirect = safeUrl(response.headers.get('location'));
    if (!redirect || !redirect.hostname.endsWith('.googleusercontent.com')) return null;
    response = await request(redirect.href, { signal, redirect:'manual' });
  }
  if (!response.ok || Number(response.headers.get('content-length')) > MAX) return null;
  const type = (response.headers.get('content-type') || '').split(';')[0].toLowerCase();
  if (!type || /text\/html|application\/(?:json|xml)/.test(type)) return null;
  const chunks = []; let length = 0;
  for await (const chunk of response.body || []) {
    length += chunk.length;
    if (length > MAX) return null;
    chunks.push(chunk);
  }
  const bytes = Buffer.concat(chunks);
  if (!bytes.length || /^\s*(?:<!doctype|<html)/i.test(bytes.subarray(0,300).toString())) return null;
  const name = file.filename || '';
  if (/\.pdf$/i.test(name) && !bytes.subarray(0,5).equals(Buffer.from('%PDF-'))) return null;
  if (/\.(xlsx|docx|pptx|zip)$/i.test(name) && (bytes.length < 4 || bytes.readUInt32BE(0) !== 0x504b0304)) return null;
  return { bytes, type };
}
