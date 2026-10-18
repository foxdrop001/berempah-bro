/**
 * Registers the service worker (sw.js at the site root) so the site can be
 * installed to a phone's home screen and still opens with a bad connection.
 * Paths are worked out from this script's own address, so it works at any
 * page depth and on hosts that serve the site from a subfolder.
 */
(function () {
  'use strict';
  if (!('serviceWorker' in navigator)) return;
  var me = document.currentScript && document.currentScript.src;
  if (!me) return;
  var root = new URL('../', me);
  window.addEventListener('load', function () {
    navigator.serviceWorker.register(new URL('sw.js', root).href, { scope: root.pathname })
      .catch(function () { /* no service worker, the site still works normally */ });
  });
})();
