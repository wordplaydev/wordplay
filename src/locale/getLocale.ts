import type LanguageCode from '@locale/LanguageCode';
import type LocaleText from '@locale/LocaleText';

export async function getLocale(
    language: LanguageCode,
    test = false,
): Promise<LocaleText | undefined> {
    const response = await fetch(
        `${
            test ? 'http://localhost:5173' : ''
        }/locales/${language}/${language}.json`,
    );
    if (response.status !== 200) return undefined;
    return (await response.json()) as LocaleText;
}
