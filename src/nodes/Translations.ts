import type Docs from './Docs';
import type LanguageCode from './LanguageCode';

type Translations = Record<LanguageCode, string>;
export default Translations;

export const TRANSLATE = 'TBD';
export const WRITE = 'Documentation TBD';

export const WRITE_DOCS = {
    eng: WRITE,
    '😀': WRITE,
};

export function overrideWithDocs(translations: Translations, docs: Docs) {
    // Override with documentation, if available.
    for (const [lang, doc] of Object.entries(docs.getTranslations())) {
        translations[lang as LanguageCode] = doc;
    }
    return translations;
}

export function selectTranslation(
    translations: Translations,
    languages: LanguageCode[]
) {
    const available = Object.keys(translations);
    const choice =
        languages.find((lang) => available.includes(lang)) ?? available[0];
    return translations[choice as LanguageCode];
}
