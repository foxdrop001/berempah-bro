/**
 * Berempah Bros conversion tracking.
 *
 * Business events (the ones the brand cares about):
 *   order_click:      someone left for the Oddle ordering store
 *   directions_click: someone asked for directions to a stall
 *   call_click:       someone tapped a phone number
 *   promo_click:      someone used the promo code
 *   catering_start:   someone opened or started a catering enquiry
 *   catering_submit:  catering enquiry sent
 *   contact_submit:   general contact form sent
 *   signup_submit:    Crunch Club signup sent
 *   menu_builder_use: someone set up a plate in the order builder
 *
 * In the markup, add data-track="<event>" to any element you want tracked.
 * Extra context if you want it: data-outlet, data-promo, data-item.
 *
 * GA4 only loads if data/site.json has a ga4MeasurementId (build.mjs writes it
 * to assets/analytics-config.js). With no ID the events still get pushed to
 * window.dataLayer, so nothing breaks and the events can be replayed later.
 */
(function () {
  'use strict';

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = window.gtag || gtag;

  var GA_ID = window.BB_GA4_ID || null;

  if (GA_ID) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_ID);
    document.head.appendChild(s);
    gtag('js', new Date());
    // Google signals (cross-site ads) off. GA4 anonymises IPs by default in EU/SG anyway.
    gtag('config', GA_ID, { anonymize_ip: true, allow_google_signals: false });
  }

  function track(event, params) {
    var payload = params || {};
    payload.page_path = location.pathname;
    if (GA_ID) gtag('event', event, payload);
    else window.dataLayer.push(Object.assign({ event: event }, payload));
  }
  window.bbTrack = track;

  var EVENT_MAP = {
    order: 'order_click',
    directions: 'directions_click',
    call: 'call_click',
    promo: 'promo_click',
    catering_start: 'catering_start',
  };

  // One delegated click listener handles every tagged element.
  document.addEventListener('click', function (e) {
    var el = e.target && e.target.closest ? e.target.closest('[data-track]') : null;
    if (!el) return;
    var kind = el.getAttribute('data-track');
    var name = EVENT_MAP[kind] || kind;
    track(name, {
      outlet: el.getAttribute('data-outlet') || undefined,
      promo_code: el.getAttribute('data-promo') || undefined,
      item: el.getAttribute('data-item') || undefined,
      link_url: el.getAttribute('href') || undefined,
    });
  }, { passive: true });

  // Count the form submits we care about.
  document.addEventListener('submit', function (e) {
    // The page's own validation might cancel the submit. A rejected attempt
    // isn't a conversion, so skip it.
    if (e.defaultPrevented) return;
    var f = e.target;
    if (!f || !f.id) return;
    if (f.id === 'cateringForm') track('catering_submit', { headcount: (f.querySelector('[name="headcount"]') || {}).value });
    else if (f.id === 'contactFormEl') track('contact_submit', { topic: (f.querySelector('[name="topic"]') || {}).value });
    else if (f.id === 'clubForm') track('signup_submit', {});
  }, { passive: true });

  // Order builder: only fire once per page view, however many options get toggled.
  var builderFired = false;
  document.addEventListener('change', function (e) {
    if (builderFired) return;
    var f = e.target && e.target.closest ? e.target.closest('#builderForm') : null;
    if (!f) return;
    builderFired = true;
    track('menu_builder_use', {});
  }, { passive: true });

  // Thank-you states, after the form provider redirects back here. Once it's
  // counted, remove the flag from the URL so a refresh or a shared or
  // bookmarked link doesn't count the same conversion again.
  var q = new URLSearchParams(location.search);
  var confirmed = { sent: 'contact_submit_confirmed', joined: 'signup_confirmed', catering: 'catering_submit_confirmed' };
  var counted = false;
  Object.keys(confirmed).forEach(function (flag) {
    if (q.has(flag)) { track(confirmed[flag], {}); q.delete(flag); counted = true; }
  });
  if (counted && window.history && history.replaceState) {
    var qs = q.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : '') + location.hash);
  }
})();
