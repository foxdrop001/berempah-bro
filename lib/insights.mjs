/**
 * Insights: privacy-friendly visit and click counts for the dashboard.
 *
 * Every page view and tracked click (order, directions, call, promo, forms,
 * notifications) adds 1 to a counter for that day. Nothing about the visitor
 * is stored: no IP address, cookie, device id or user agent, only totals per
 * day. Counters live in the same Upstash Redis store as push subscribers and
 * expire after about 13 months.
 *
 * Storage: one hash per Singapore calendar day, key bb:ins:YYYY-MM-DD, with
 * fields like  e:order_click  (event total),  p:/menu/  (page views per page)
 * and  o:directions_click:beauty-world  (event per outlet).
 */
const PREFIX = 'bb:ins:';
const KEEP_SECONDS = 400 * 24 * 3600;

// Only these events and pages are counted. Anything else is dropped, so the
// public endpoint can't be used to fill the store with junk keys.
export const EVENTS = new Set([
  'pageview', 'order_click', 'directions_click', 'call_click', 'promo_click',
  'catering_start', 'catering_submit', 'contact_submit', 'signup_submit',
  'catering_submit_confirmed', 'contact_submit_confirmed', 'signup_confirmed',
  'menu_builder_use', 'push_subscribe', 'notif_open',
]);
const PAGE_RE = /^\/(?:|story\/|menu\/|locations\/(?:[a-z0-9-]{1,40}\/)?|careers\/|contact\/|news\/|privacy\/)$/;
const OUTLET_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const BOT_RE = /bot|crawl|spider|slurp|preview|facebookexternalhit|headless|lighthouse|pingdom|monitor/i;

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}
export const insightsConfigured = () => !!redisConfig();

// Several commands in one round trip (Upstash REST /pipeline).
async function pipeline(commands) {
  const cfg = redisConfig();
  if (!cfg) throw new Error('storage not connected');
  const r = await fetch(`${cfg.url}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  const j = await r.json().catch(() => null);
  if (!r.ok || !Array.isArray(j)) throw new Error(`storage error: ${r.status}`);
  return j.map((x) => x.result);
}

// Today's date in Singapore, as YYYY-MM-DD, optionally shifted back by n days.
export function sgDay(daysAgo = 0, now = Date.now()) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(new Date(now - daysAgo * 86400000));
}

/** Count one event. Returns false when it was ignored (bot, bad input). */
export async function track(request, body) {
  if (BOT_RE.test(request.headers.get('user-agent') || '')) return false;
  const e = String(body && body.e || '');
  if (!EVENTS.has(e)) return false;
  const key = PREFIX + sgDay();
  const cmds = [['HINCRBY', key, `e:${e}`, 1]];
  if (e === 'pageview') {
    const p = String(body.p || '');
    if (!PAGE_RE.test(p)) return false;
    cmds.push(['HINCRBY', key, `p:${p}`, 1]);
  }
  const o = String(body.o || '');
  if (o && OUTLET_RE.test(o) && o.length <= 40) cmds.push(['HINCRBY', key, `o:${e}:${o}`, 1]);
  cmds.push(['EXPIRE', key, KEEP_SECONDS]);
  await pipeline(cmds);
  return true;
}

/** Totals for the last `days` days, for the dashboard's Insights tab. */
export async function summary(days) {
  const n = Math.min(Math.max(parseInt(days, 10) || 30, 1), 366);
  const dates = Array.from({ length: n }, (_, i) => sgDay(n - 1 - i));
  const rows = await pipeline(dates.map((d) => ['HGETALL', PREFIX + d]));
  const totals = {}, pages = {}, outlets = {}, daily = [];
  rows.forEach((flat, i) => {
    const day = { date: dates[i], pageview: 0, order_click: 0 };
    for (let k = 0; flat && k < flat.length; k += 2) {
      const field = flat[k], v = Number(flat[k + 1]) || 0;
      if (field.startsWith('e:')) {
        const e = field.slice(2);
        totals[e] = (totals[e] || 0) + v;
        if (e in day) day[e] = v;
      } else if (field.startsWith('p:')) {
        const p = field.slice(2);
        pages[p] = (pages[p] || 0) + v;
      } else if (field.startsWith('o:')) {
        const [, e, slug] = field.split(':');
        outlets[slug] = outlets[slug] || {};
        outlets[slug][e] = (outlets[slug][e] || 0) + v;
      }
    }
    daily.push(day);
  });
  return { days: n, from: dates[0], to: dates[n - 1], totals, pages, outlets, daily };
}
