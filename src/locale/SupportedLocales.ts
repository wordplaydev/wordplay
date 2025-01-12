/** A list of locales that are in progress but not supported yet. Only added when developing locally. */
export const EventuallySupportedLocales = [
    'zh-TW',
    'ko-KR',
    'fr-FR',
    'ja-JP',
    'de-DE',
    'hi-IN',
    'pa-IN',
    'ta-LK',
    'sv-FI',
]; /** A list of locales officially supported by Wordplay. */

/** Supported locale names. Update this list when a locale is ready to share with the world. */
export const SupportedLocaleCodes = ['en-US', 'es-MX', 'zh-CN'];

/** Officially supported locales that have passable text for the UI and tutorial. */
export const SupportedLocales = Array.from(
    new Set([
        ...SupportedLocaleCodes,
        // If you're developing locally, all eventually supported locales are included for testing purposes.
        ...(import.meta.hot ? EventuallySupportedLocales : []),
    ]),
); /** One of the supported locales above */

/**  */
export type SupportedLocale = (typeof SupportedLocaleCodes)[number];
