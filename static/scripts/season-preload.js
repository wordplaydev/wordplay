// Runs synchronously before the body paints, so a season (#108) is in place
// from the first frame rather than recoloring the page after it loads. The
// palettes themselves are already inline in the head (hooks.server.ts); this
// only names which one applies, from what the root layout last stored:
//
// - a season chosen by name (the `season` setting) applies as is;
// - Auto applies the resolution the layout cached for this zone and month, so
//   a first visit, a new month, or a trip abroad paints classic Wordplay until
//   the layout resolves the season again, rather than painting a stale one.
(function () {
    try {
        var choice = JSON.parse(localStorage.getItem('season') || '"auto"');
        var shown = null;
        if (choice === 'auto') {
            var cached = JSON.parse(
                localStorage.getItem('seasonResolved') || 'null',
            );
            var zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            var now = new Date();
            var month = now.getFullYear() + '-' + now.getMonth();
            if (cached && cached.zone === zone && cached.month === month)
                shown = cached;
        } else if (typeof choice === 'string' && choice !== 'none')
            shown = { season: choice };
        if (shown && typeof shown.season === 'string') {
            var html = document.documentElement;
            html.setAttribute('data-season', shown.season);
            if (typeof shown.condition === 'string')
                html.setAttribute('data-season-condition', shown.condition);
        }
    } catch (_) {
        // No storage or a malformed value: classic Wordplay, which is correct.
    }
})();
