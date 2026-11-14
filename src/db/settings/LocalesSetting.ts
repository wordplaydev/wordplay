import {
    isSupportedLocale,
    type SupportedLocale,
} from '#locale/SupportedLocales.ts';
import Setting from '#db/settings/Setting.ts';

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

/** Whether localization mode is on, kept per device so a reload keeps drafts on screen (#1495). */
export const LocalizingSetting = new Setting<boolean>(
    'localizing',
    true,
    false,
    (value) => (typeof value === 'boolean' ? value : false),
    (current, value) => current === value,
);
