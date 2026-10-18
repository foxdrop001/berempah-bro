/**
 * Open-now chips: adds an open/closed chip to every card that has a
 * data-hours="HH:MM-HH:MM" attribute (the build writes it from site.json).
 *
 * The hours are in Singapore time, so we compare against the Singapore clock.
 * Someone browsing from overseas still sees whether the stall is open right
 * now, instead of a result based on their own local time.
 */
(function () {
  'use strict';
  try {
    var parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Singapore', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
    var hm = parts.split(':').map(Number);
    var now = hm[0] * 60 + hm[1];
    // e.g. "10:30" becomes "10:30am", "13:00" becomes "1pm"
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
  } catch (e) { /* no clock available, skip the chips */ }
})();
