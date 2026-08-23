/**
 * Open-now chips: appends an open/closed chip to every card with a
 * data-hours="HH:MM-HH:MM" attribute (written by the build from site.json).
 *
 * The times are Singapore times, so the comparison uses the Singapore clock —
 * an overseas visitor sees the stall's real status, not their local time's.
 */
(function () {
  'use strict';
  try {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    var hm = parts.split(':').map(Number);
    var now = hm[0] * 60 + hm[1];
    // "10:30" → "10:30am", "13:00" → "1pm"
    function fmt(t) {
      var p = t.split(':').map(Number);
      var suffix = p[0] < 12 ? 'am' : 'pm';
      var h12 = ((p[0] + 11) % 12) + 1;
      return h12 + (p[1] ? ':' + (p[1] < 10 ? '0' : '') + p[1] : '') + suffix;
    }
    document.querySelectorAll('[data-hours]').forEach(function (card) {
      var oc = card.dataset.hours.split('-');
      var o = oc[0].split(':').map(Number);
      var c = oc[1].split(':').map(Number);
      var open = now >= o[0] * 60 + o[1] && now < c[0] * 60 + c[1];
      var chip = document.createElement('span');
      chip.className = 'loc-chip ' + (open ? 'open' : 'closed');
      chip.textContent = open ? '● Open now' : '● Closed — opens ' + fmt(oc[0]);
      card.appendChild(chip);
    });
  } catch (e) { /* clock unavailable — skip chips */ }
})();
