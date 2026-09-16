import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';
import { isLocaleText } from '@locale/isLocaleText';
import versioned from '@db/locales/versioned';

export async function getLocale(
    language: LanguageCode,
    test = false,
): Promise<LocaleText | undefined> {
    const response = await fetch(
        versioned(
            `${
                test ? 'http://localhost:5173' : ''
            }/locales/${language}/${language}.json`,
        ),
    );
    if (response.status !== 200) return undefined;
    const data: unknown = await response.json();
    return isLocaleText(data) ? data : undefined;
}
