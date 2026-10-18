/**
 * Vercel routing middleware: keeps the content dashboard off the public site.
 *
 * The dashboard is not reachable at /admin/. It is served only at a secret
 * address, behind a browser login. All three values live in the Vercel project
 * settings (Environment Variables), never in this public repo:
 *
 *   ADMIN_PATH      the secret address, e.g. "kitchen-7f3k" -> /kitchen-7f3k/
 *   ADMIN_USER      login username
 *   ADMIN_PASSWORD  login password
 *
 * If any of them is missing, the dashboard is off everywhere (fails closed).
 * The page itself comes from admin/page.mjs, which build.mjs writes from
 * admin/index.html. Local editing still works through `npm run admin`.
 */
import ADMIN_HTML from './admin/page.mjs';
import { validEndpoint, pushConfigured, addSubscriber, removeSubscriber, countSubscribers, latestMessage, sendToAll } from './lib/push.mjs';

const notFound = () => new Response('Not found', {
  status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});
const json = (obj, status = 200) => new Response(JSON.stringify(obj), {
  status,
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
});

// Small JSON bodies only: these routes never need more than a few hundred bytes.
async function readJson(request, max = 4096) {
  const text = await request.text();
  if (text.length > max) throw new Error('too large');
  return JSON.parse(text);
}

/* Public push routes used by assets/pwa.js and the service worker. */
async function publicPush(request, pathname) {
  if (pathname === '/api/push/config' && request.method === 'GET') {
    return json({ enabled: pushConfigured(), publicKey: process.env.VAPID_PUBLIC_KEY || null });
  }
  if (pathname === '/api/push/latest' && request.method === 'GET') {
    if (!pushConfigured()) return json(null);
    return json(await latestMessage());
  }
  if ((pathname === '/api/push/subscribe' || pathname === '/api/push/unsubscribe') && request.method === 'POST') {
    if (!pushConfigured()) return json({ error: 'notifications are not set up yet' }, 503);
    let body;
    try { body = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
    if (!validEndpoint(body && body.endpoint)) return json({ error: 'unsupported push service' }, 400);
    if (pathname.endsWith('/subscribe')) await addSubscriber(body.endpoint);
    else await removeSubscriber(body.endpoint);
    return json({ ok: true });
  }
  return notFound();
}

/* Dashboard-only push routes, under the secret address so the browser sends
   the dashboard login with them automatically. */
async function adminPush(request, action) {
  if (action === 'push-stats' && request.method === 'GET') {
    if (!pushConfigured()) return json({ configured: false, subscribers: 0 });
    return json({ configured: true, subscribers: await countSubscribers() });
  }
  if (action === 'push-send' && request.method === 'POST') {
    if (!pushConfigured()) return json({ error: 'Notifications are not set up yet (see the Notify tab).' }, 503);
    let b;
    try { b = await readJson(request); } catch { return json({ error: 'bad request' }, 400); }
    const title = String(b.title || '').trim().slice(0, 80);
    const body = String(b.body || '').trim().slice(0, 240);
    const url = String(b.url || '/').trim();
    if (!title) return json({ error: 'A title is needed.' }, 400);
    // Links stay on this site (a path like /menu/) or go to a full https address.
    if (!/^\/(?!\/)/.test(url) && !/^https:\/\//.test(url)) return json({ error: 'Link must start with / or https://' }, 400);
    const result = await sendToAll({ title, body, url, ts: Date.now() });
    return json({ ok: true, ...result });
  }
  return notFound();
}

// Compare without bailing out on the first different character, so the time
// taken doesn't hint at how much of a guess was right.
function same(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
}

function authorised(request, user, pass) {
  const header = request.headers.get('authorization') || '';
  if (!header.startsWith('Basic ')) return false;
  let decoded = '';
  try { decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6)), (c) => c.charCodeAt(0))); }
  catch { return false; }
  const i = decoded.indexOf(':');
  if (i < 0) return false;
  // Check both halves every time, again so timing gives nothing away.
  const okUser = same(decoded.slice(0, i), user);
  const okPass = same(decoded.slice(i + 1), pass);
  return okUser && okPass;
}

export default async function middleware(request) {
  const { pathname } = new URL(request.url);

  // The plain /admin address is closed for everyone, including the source
  // file and the generated page module that sit in that folder. Same for the
  // server-side code folder.
  if (pathname === '/admin' || pathname.startsWith('/admin/') || pathname.startsWith('/lib/')) return notFound();

  if (pathname.startsWith('/api/push/')) {
    try { return await publicPush(request, pathname); }
    catch (e) { return json({ error: 'server error' }, 500); }
  }

  const slug = (process.env.ADMIN_PATH || '').replace(/^\/+|\/+$/g, '');
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!slug || !user || !pass) return; // dashboard off, carry on serving the site

  if (pathname === `/${slug}`) {
    // Trailing slash matters: the page loads ../assets and ../data relative to it.
    return new Response(null, { status: 308, headers: { Location: `/${slug}/` } });
  }
  if (!pathname.startsWith(`/${slug}/`)) return;
  const action = pathname.slice(slug.length + 2);
  if (action !== '' && action !== 'index.html' && action !== 'push-stats' && action !== 'push-send') return;

  if (!authorised(request, user, pass)) {
    return new Response('Login required', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="Berempah Bros dashboard", charset="UTF-8"',
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
  }
  if (action === 'push-stats' || action === 'push-send') {
    try { return await adminPush(request, action); }
    catch (e) { return json({ error: `Sending failed: ${e.message}` }, 500); }
  }
  return new Response(ADMIN_HTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Frame-Options': 'DENY',
    },
  });
}

// Skip static files that can't be the dashboard, so most requests never run
// this code. Pages, folders and /admin still pass through.
export const config = {
  matcher: ['/((?!assets/|data/|sw\\.js|manifest\\.webmanifest|robots\\.txt|sitemap\\.xml|favicon).*)'],
  runtime: 'nodejs',
};
