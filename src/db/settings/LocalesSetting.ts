import {
    isSupportedLocale,
    type SupportedLocale,
} from '@locale/SupportedLocales';
import Setting from '@db/settings/Setting';

export const LocalesSetting = new Setting<SupportedLocale[]>(
    'locales',
    false,
    ['en-US'],
    (value) =>
        Array.isArray(value) &&
        value.every(
            (locale): locale is SupportedLocale =>
                typeof locale === 'string' && isSupportedLocale(locale),
        )
            ? value
            : undefined,
    (current, value) =>
        current.length === value.length &&
        current.every((locale, index) => value[index] === locale),
);
