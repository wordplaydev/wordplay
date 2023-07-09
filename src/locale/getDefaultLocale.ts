import type LanguageCode from './LanguageCode';
import type Locale from './Locale';

export async function getLocale(
    language: LanguageCode,
    test: boolean = false
): Promise<Locale | undefined> {
    const response = await fetch(
        `${
            test ? 'http://localhost:5173' : ''
        }/locales/${language}/${language}.json`
    );
    if (response.status !== 200) return undefined;
    return (await response.json()) as Locale;
}

export default async function getDefaultLocale(test: boolean = false) {
    return getLocale('en', test) as Promise<Locale>;
}
