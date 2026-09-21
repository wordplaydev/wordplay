// Runs synchronously before SvelteKit body content is painted.
//
// Two jobs, deliberately independent:
//
// 1. Ask for this reader's locale text now, and hand the result to
//    LocalesDatabase. Nothing else names that URL until the JS bundle has
//    loaded and LocalesDatabase's constructor runs — measured on production at
//    ~330ms after the first JS request, with 65 of 66 JS requests issued ahead
//    of it. The `?v=` hash has to match what versioned() will request, so the
//    hashes are handed to us by hooks.server.ts in window.__localeAssets.
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

    // Record that this URL's early fetch came back with nothing, then answer
    // `undefined` so the handover contract is unchanged.
    function missed(url) {
        try {
            window.__localePreloadFailed.push(url);
            console.warn('locale preload failed, refetching: ' + url);
        } catch (_) {}
        return undefined;
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
            // We fetch rather than `<link rel="preload" as="fetch">`, and hand
            // the promise over by URL, because a preload is only reused when
            // the browser's preload cache matches it against the later
            // request — and WebKit does not match an `as="fetch"` entry, so
            // Safari downloaded every locale file twice (the same reason
            // app.html does not preload the emoji font). Fetching here and
            // awaiting it there is one request on every engine, with no
            // matching rules to get wrong.
            //
            // The stored value is the *parsed JSON*, not the Response: a body
            // can only be read once. The catch is load-bearing too — nothing
            // awaits this until the bundle runs, so a rejection with no
            // handler would surface as an unhandled error.
            //
            // A failure is recorded as well as swallowed. LocalesDatabase
            // answers `undefined` by fetching properly, which is the right
            // thing to do — but it means a failed early fetch costs the reader
            // the whole file a second time, and nothing said so. Now the URLs
            // that fell back are listed here, so a check can tell a broken
            // handover (two requests, nothing recorded) from this (two
            // requests, recorded), and so it is visible in a console.
            window.__localePreload = window.__localePreload || {};
            window.__localePreloadFailed = window.__localePreloadFailed || [];
            var entry = assets[locale];
            var files = [[entry.m, locale + '.json']];
            if (entry.d) files.push([entry.d, locale + '-datetimes.json']);
            for (var i = 0; i < files.length; i++) {
                var url =
                    '/locales/' +
                    locale +
                    '/' +
                    files[i][1] +
                    '?v=' +
                    encodeURIComponent(files[i][0]);
                window.__localePreload[url] = fetch(url)
                    .then(function (response) {
                        return response.ok ? response.json() : missed(url);
                    })
                    .catch(function () {
                        return missed(url);
                    });
            }
        }
    } catch (_) {}

    try {
        // Hide until the right text has loaded, so a reader does not watch
        // English swap to their language. Two ways to know this page is not
        // English: the URL names a locale, or the reader has chosen one before.
        //
        // The URL case only became reasonable once the fetch above existed.
        // Before it the locale was not requested until the JS bundle had run,
        // so hiding meant a blank page for ~300ms; now the request goes out
        // while the document is still parsing.
        var path = (location.pathname.split('/')[1] || '').split('+')[0];
        var fromPath =
            path && path !== 'en-US' && /^[a-z]{2}(-[A-Za-z0-9]+)*$/.test(path);
        var locales = JSON.parse(
            localStorage.getItem('locales') || '["en-US"]',
        );
        var fromSetting = Array.isArray(locales) && locales[0] !== 'en-US';
        if (fromPath || fromSetting) {
            document.documentElement.classList.add('locale-loading');
            // Safety valve: always reveal after 5 seconds in case something goes wrong.
            setTimeout(function () {
                document.documentElement.classList.remove('locale-loading');
            }, 5000);
        }
    } catch (_) {}
})();
