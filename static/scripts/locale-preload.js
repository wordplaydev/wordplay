// Runs synchronously before SvelteKit body content is painted.
// If the user's preferred locale is not en-US, hides the body until
// the Svelte layout has loaded the correct locale and removes the class.
// This prevents a flash of pre-rendered English content on page load.
(function () {
    try {
        var locales = JSON.parse(localStorage.getItem('locales') || '["en-US"]');
        if (Array.isArray(locales) && locales[0] !== 'en-US') {
            document.documentElement.classList.add('locale-loading');
            // Safety valve: always reveal after 5 seconds in case something goes wrong.
            setTimeout(function () {
                document.documentElement.classList.remove('locale-loading');
            }, 5000);
        }
    } catch (_) {}
})();
