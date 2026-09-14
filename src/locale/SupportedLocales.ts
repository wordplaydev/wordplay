/** A list of locales that are in progress but not supported yet. Only added when developing locally. */
export const DraftLocales = [
    'zh-TW',
    'fr-FR',
    'ja-JP',
    'de-DE',
    'hi-IN',
    'pa-IN',
    'ta-IN-LK-SG',
    'sv-SE',
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
    'he-IL',
    'vi-VN',
    'tl-PH',
    'bn-BD',
    'id-ID',
    'ro-RO',
    'pt-PT',
    'ne-NP',
    'fa-AF',
];

/** Supported locale names. Put a locale in this list when it's no longer a draft. */
const CompleteLocales = ['en-US', 'es-MX', 'zh-CN', 'ko-KR'];

/** Officially supported locales that have passable text for the UI and tutorial. */
export const SupportedLocales = Array.from(
    new Set([...CompleteLocales, ...DraftLocales]),
);

/** A type to represent one of the strings above */
export type SupportedLocale = (typeof SupportedLocales)[number];

const SupportedLocaleSet: ReadonlySet<string> = new Set(SupportedLocales);

/** Whether a string names a supported locale, narrowing it when it does. */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
    return SupportedLocaleSet.has(locale);
}

/**
 * The web app manifest a page in the given locale links to: there's one per
 * locale, since a manifest carries only one language and an installed app
 * should be named in the language it was installed from (#564). A code with no
 * manifest — an unknown segment, or a multilingual tag like `es_en-MX` — falls
 * back to en-US, so this never returns a 404 that would quietly make the app
 * uninstallable.
 */
export function getManifestPath(locale: string): string {
    return `/manifests/${isSupportedLocale(locale) ? locale : 'en-US'}.webmanifest`;
}
