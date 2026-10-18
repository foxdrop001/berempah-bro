/**
 * Copies push subscribers between Upstash Redis databases, for moving the
 * site to a new Vercel account without everyone having to tap "Get notified"
 * again.
 *
 *   node tools/push-subscribers.mjs export > subscribers.json
 *   node tools/push-subscribers.mjs import < subscribers.json
 *
 * Each run talks to the database in these environment variables (copy them
 * from Vercel > Storage > the database > .env.local tab):
 *   KV_REST_API_URL and KV_REST_API_TOKEN
 *   (or UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN)
 *
 * Important: subscriptions are tied to the VAPID key pair. The new project
 * must use the SAME VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY as the old one, or
 * the imported subscribers can't be reached.
 *
 * subscribers.json holds push addresses (no names or emails). Delete it once
 * the import is done.
 */
const SUBS = 'bb:push:subs';
const LATEST = 'bb:push:latest';

const url = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/$/, '');
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error('Set KV_REST_API_URL and KV_REST_API_TOKEN for the database first (see the top of this file).');
  process.exit(1);
}

async function redis(...command) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(command),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error) throw new Error(`database error: ${j.error || r.status}`);
  return j.result;
}

const mode = process.argv[2];
if (mode === 'export') {
  const subscribers = (await redis('SMEMBERS', SUBS)) || [];
  const latest = await redis('GET', LATEST);
  process.stdout.write(JSON.stringify({ exported: new Date().toISOString(), subscribers, latest: latest ? JSON.parse(latest) : null }, null, 2) + '\n');
  console.error(`exported ${subscribers.length} subscriber(s)`);
} else if (mode === 'import') {
  let raw = '';
  for await (const chunk of process.stdin) raw += chunk;
  const dump = JSON.parse(raw);
  const subs = Array.isArray(dump.subscribers) ? dump.subscribers.filter((s) => typeof s === 'string' && s.startsWith('https://')) : [];
  for (let i = 0; i < subs.length; i += 500) await redis('SADD', SUBS, ...subs.slice(i, i + 500));
  if (dump.latest) await redis('SET', LATEST, JSON.stringify(dump.latest));
  console.error(`imported ${subs.length} subscriber(s); the database now has ${await redis('SCARD', SUBS)}`);
} else {
  console.error('Usage: node tools/push-subscribers.mjs export > subscribers.json\n       node tools/push-subscribers.mjs import < subscribers.json');
  process.exit(1);
}
