import { TranslatableLocales } from '@locale/LanguageCode';
import type Locale from '@locale/Locale';

/**
 * The single, provider-agnostic source of target locales Wordplay offers for
 * machine translation — used by in-app project translation (and future
 * features like chat translation) instead of assuming a specific backend's
 * supported set.
 *
 * The in-app default backend (Claude) has no `getLanguages()`-style endpoint
 * and covers the full curated list, so the offered set is `TranslatableLocales`.
 * Backends with a narrower set (e.g. the Google fallback) report their own
 * coverage via `Translator.getSupportedLocales()`; if a fallback can't serve a
 * requested target, callers surface a failure rather than silently degrading.
 */
export default function getTranslatableLocales(): Locale[] {
    return TranslatableLocales;
}
