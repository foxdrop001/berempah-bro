/**
 * Web push for the site, with no npm packages.
 *
 * How it works: a visitor who taps "Get notified" hands us their push address
 * (an https URL at Google/Apple/Mozilla/Microsoft). We keep only that address,
 * in Upstash Redis. To send, the dashboard saves the message as "latest" and we
 * ping every address with an empty push signed with our VAPID key. The phone's
 * service worker wakes up, fetches the latest message from /api/push/latest and
 * shows it. Empty pushes mean no payload encryption code is needed here.
 *
 * Settings (Vercel > Settings > Environment Variables):
 *   VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY   from `npm run vapid`
 *   VAPID_SUBJECT                          mailto: address push services can contact
 *   KV_REST_API_URL + KV_REST_API_TOKEN    added automatically when an Upstash
 *     (or UPSTASH_REDIS_REST_URL/_TOKEN)   Redis store is connected to the project
 */
import { createPrivateKey, sign } from 'node:crypto';

const SUBS = 'bb:push:subs';
const LATEST = 'bb:push:latest';

// Only real browser push services. Anything else is refused, so the send step
// can't be pointed at arbitrary servers.
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^web\.push\.apple\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

export function validEndpoint(v) {
  if (typeof v !== 'string' || v.length > 1024) return false;
  try {
    const u = new URL(v);
    return u.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(u.hostname));
  } catch { return false; }
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

export function pushConfigured() {
  return !!(redisConfig() && process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

async function redis(...command) {
  const cfg = redisConfig();
  if (!cfg) throw new Error('storage not connected');
  const r = await fetch(cfg.url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`storage error: ${j.error || r.status}`);
  return j.result;
}

export const addSubscriber = (endpoint) => redis('SADD', SUBS, endpoint);
export const removeSubscriber = (endpoint) => redis('SREM', SUBS, endpoint);
export const countSubscribers = () => redis('SCARD', SUBS);

export async function latestMessage() {
  const raw = await redis('GET', LATEST);
  return raw ? JSON.parse(raw) : null;
}

const b64url = (buf) => Buffer.from(buf).toString('base64url');

// VAPID: a short-lived ES256 token proving the push comes from this site.
function vapidHeader(endpoint) {
  const pub = Buffer.from(process.env.VAPID_PUBLIC_KEY, 'base64url'); // 0x04 | x | y
  const key = createPrivateKey({
    format: 'jwk',
    key: { kty: 'EC', crv: 'P-256', d: process.env.VAPID_PRIVATE_KEY,
      x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)) },
  });
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64url(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: process.env.VAPID_SUBJECT || 'mailto:berempahbros.general@gmail.com',
  }));
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${body}.${b64url(sig)}, k=${process.env.VAPID_PUBLIC_KEY}`;
}

/** Save the message, then wake every subscriber. Dead addresses are removed. */
export async function sendToAll(message) {
  await redis('SET', LATEST, JSON.stringify(message));
  const endpoints = (await redis('SMEMBERS', SUBS)) || [];
  let sent = 0, removed = 0, failed = 0;
  // A few at a time so a long list doesn't open hundreds of connections at once.
  for (let i = 0; i < endpoints.length; i += 25) {
    await Promise.all(endpoints.slice(i, i + 25).map(async (ep) => {
      try {
        const r = await fetch(ep, {
          method: 'POST',
          headers: { Authorization: vapidHeader(ep), TTL: '86400', Urgency: 'normal', 'Content-Length': '0' },
        });
        if (r.status === 404 || r.status === 410) { await removeSubscriber(ep); removed++; }
        else if (r.ok) sent++;
        else failed++;
      } catch { failed++; }
    }));
  }
  return { total: endpoints.length, sent, removed, failed };
}
