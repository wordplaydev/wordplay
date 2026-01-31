/** A list of locales that are in progress but not supported yet. Only added when developing locally. */
export const DraftLocales = [
    'zh-TW',
    'fr-FR',
    'ja-JP',
    'de-DE',
    'hi-IN',
    'pa-IN',
    'ta-IN-LK-SG',
    'sv-FI',
    'sr-RS',
    'mr-IN',
    'pl-PL',
    'gu-IN',
    'tr-TR',
    'ar-SA',
    'el-GR',
    'kn-IN',
    'te-IN',
    'as-IN',
];

/** Supported locale names. Put a locale in this list when it's no longer a draft. */
const CompleteLocales = ['en-US', 'es-MX', 'zh-CN', 'ko-KR'];

/** Officially supported locales that have passable text for the UI and tutorial. */
export const SupportedLocales = Array.from(
    new Set([...CompleteLocales, ...DraftLocales]),
);

/** A type to represent one of the strings above */
export type SupportedLocale = (typeof SupportedLocales)[number];
