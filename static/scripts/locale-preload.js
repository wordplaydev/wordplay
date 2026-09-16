// Runs synchronously before SvelteKit body content is painted.
//
// Two jobs, deliberately independent:
//
// 1. Ask the browser for this reader's locale text now. Nothing else names
//    that URL until the JS bundle has loaded and LocalesDatabase's constructor
//    runs — measured on production at ~330ms after the first JS request, with
//    65 of 66 JS requests issued ahead of it. The `?v=` hash has to match what
//    versioned() will request or the file is fetched twice, so the hashes are
//    handed to us by hooks.server.ts in window.__localeAssets.
//
// 2. If the reader's *stored* preference is not en-US, hide the body until the
//    right locale has loaded, so they do not see a flash of pre-rendered
//    English. Deliberately still keyed on the stored setting alone: a
//    first-time visitor to /es-MX is better served seeing English briefly than
//    risking a blank page on a failed fetch.
(function () {
    function supported(assets, code) {
        return code && Object.prototype.hasOwnProperty.call(assets, code)
            ? code
            : null;
    }

    try {
        var assets = window.__localeAssets || {};

        // The locale this page is for: the URL names it, or the setting does.
        // The URL form matches SvelteKit's [[locale]] param, which may join
        // several with "+" — the first is the one whose text loads first.
        var path = (location.pathname.split('/')[1] || '').split('+')[0];
        var locale = supported(assets, path);
        if (!locale) {
            var stored = JSON.parse(
                localStorage.getItem('locales') || '["en-US"]',
            );
            if (Array.isArray(stored)) locale = supported(assets, stored[0]);
        }

        if (locale) {
            var entry = assets[locale];
            var files = [[entry.m, locale + '.json']];
            if (entry.d) files.push([entry.d, locale + '-datetimes.json']);
            for (var i = 0; i < files.length; i++) {
                var link = document.createElement('link');
                link.rel = 'preload';
                link.as = 'fetch';
                // Must match LocaleFetchOptions in LocalesDatabase: as="fetch"
                // with crossorigin means no credentials, and a mismatch makes
                // the browser fetch the file twice instead of reusing this.
                link.crossOrigin = 'anonymous';
                link.href =
                    '/locales/' +
                    locale +
                    '/' +
                    files[i][1] +
                    '?v=' +
                    encodeURIComponent(files[i][0]);
                document.head.appendChild(link);
            }
        }
    } catch (_) {}

    try {
        var locales = JSON.parse(
            localStorage.getItem('locales') || '["en-US"]',
        );
        if (Array.isArray(locales) && locales[0] !== 'en-US') {
            document.documentElement.classList.add('locale-loading');
            // Safety valve: always reveal after 5 seconds in case something goes wrong.
            setTimeout(function () {
                document.documentElement.classList.remove('locale-loading');
            }, 5000);
        }
    } catch (_) {}
})();
