/**
 * Registers the service worker (sw.js at the site root) so the site can be
 * installed to a phone's home screen and still opens with a bad connection.
 * Paths are worked out from this script's own address, so it works at any
 * page depth and on hosts that serve the site from a subfolder.
 *
 * Also runs the "Get notified" button ([data-push-optin]) in the footer. The
 * button stays hidden unless this browser can do push and the site has push
 * set up (/api/push/config says enabled), so nobody sees a button that can't work.
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var me = document.currentScript && document.currentScript.src;
  if (!me) return;
  var root = new URL('../', me);
  var api = function (p) { return new URL('api/push/' + p, root).href; };

  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.pathname })
      .then(setupPush)
      .catch(function () { /* no service worker, the site still works normally */ });
  });

  function keyBytes(b64) {
    var s = (b64 + '='.repeat((4 - b64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var raw = atob(s), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  function setupPush() {
    var btns = document.querySelectorAll('[data-push-optin]');
    var hints = document.querySelectorAll('[data-push-hint]');
    if (!btns.length) return;
    var hint = function (msg) { hints.forEach(function (h) { h.textContent = msg || ''; h.hidden = !msg; }); };

    var standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    var iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    fetch(api('config'), { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (cfg) {
      if (!cfg || !cfg.enabled || !cfg.publicKey) return;
      // iPhones only allow push for sites added to the home screen.
      if (iOS && !standalone) {
        hint('Want alerts on iPhone? Tap Share, then "Add to Home Screen", open the app and tap Get notified.');
        return;
      }
      if (!('PushManager' in window) || !('Notification' in window)) return;

      navigator.serviceWorker.ready.then(function (reg) {
        var label = function (on) {
          btns.forEach(function (b) {
            b.hidden = false;
            b.setAttribute('aria-pressed', String(on));
            b.textContent = on ? 'Notifications on (tap to turn off)' : 'Get notified: new stalls & promos';
          });
        };
        var refresh = function () { return reg.pushManager.getSubscription().then(function (s) { label(!!s); return s; }); };
        refresh();
        if (Notification.permission === 'denied') hint('Notifications are blocked for this site in your browser settings.');

        btns.forEach(function (b) {
          b.addEventListener('click', function () {
            b.disabled = true;
            reg.pushManager.getSubscription().then(function (sub) {
              if (sub) {
                return fetch(api('unsubscribe'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) })
                  .catch(function () {}).then(function () { return sub.unsubscribe(); }).then(function () { hint(''); });
              }
              return Notification.requestPermission().then(function (perm) {
                if (perm !== 'granted') { hint('No problem. You can turn alerts on any time from here.'); return; }
                return reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(cfg.publicKey) })
                  .then(function (s) {
                    return fetch(api('subscribe'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: s.endpoint }) })
                      .then(function (r) { if (!r.ok) throw new Error(); hint("You're in. We'll only ping you for the good stuff."); if (window.bbTrack) window.bbTrack('push_subscribe', {}); });
                  });
              });
            }).catch(function () { hint('Could not turn on notifications. Please try again.'); })
              .then(refresh).then(function () { b.disabled = false; });
          });
        });
      });
    }).catch(function () { /* push not available, leave the button hidden */ });
  }
})();
