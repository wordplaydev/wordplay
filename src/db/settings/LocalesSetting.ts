import { type SupportedLocale } from '@locale/SupportedLocales';
import { SupportedLocales } from '@locale/SupportedLocales';
import Setting from './Setting';

export const LocalesSetting = new Setting<SupportedLocale[]>(
    'locales',
    false,
    ['en-US'],
    (value) =>
        Array.isArray(value) &&
        value.every(
            (locale) =>
                typeof locale === 'string' &&
                SupportedLocales.includes(locale as SupportedLocale),
        )
            ? (value as SupportedLocale[])
            : undefined,
    (current, value) =>
        current.length === value.length &&
        current.every((locale, index) => value[index] === locale),
);
