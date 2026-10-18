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

const notFound = () => new Response('Not found', {
  status: 404,
  headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
});

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

export default function middleware(request) {
  const { pathname } = new URL(request.url);

  // The plain /admin address is closed for everyone, including the source
  // file and the generated page module that sit in that folder.
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return notFound();

  const slug = (process.env.ADMIN_PATH || '').replace(/^\/+|\/+$/g, '');
  const user = process.env.ADMIN_USER;
  const pass = process.env.ADMIN_PASSWORD;
  if (!slug || !user || !pass) return; // dashboard off, carry on serving the site

  if (pathname === `/${slug}`) {
    // Trailing slash matters: the page loads ../assets and ../data relative to it.
    return new Response(null, { status: 308, headers: { Location: `/${slug}/` } });
  }
  if (pathname !== `/${slug}/` && pathname !== `/${slug}/index.html`) return;

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
