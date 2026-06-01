import DefaultLocale from '@locale/DefaultLocale';
import type LocaleText from '@locale/LocaleText';

/**
 * Apply a pure property-access accessor to a locale, falling back to the default
 * locale when the accessor throws or yields undefined.
 *
 * Loaded locale JSON can be missing keys that newer code expects — a partial
 * translation, or a locale file deployed before a newly added key was translated.
 * The basis-building helpers ({@link getDocLocales}, {@link getNameLocales},
 * {@link getInputLocales}, {@link getBind}) map the accessor over every loaded
 * locale, so a single missing key would otherwise throw while constructing the
 * Basis and crash the entire app. Falling back to the default locale keeps the
 * app working with English text for the missing key.
 */
export default function selectTranslation<Kind>(
    locale: LocaleText,
    select: (locale: LocaleText) => Kind,
): Kind {
    let value: Kind | undefined;
    try {
        value = select(locale);
    } catch (_) {
        value = undefined;
    }
    return value ?? select(DefaultLocale);
}
