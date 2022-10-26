import type Docs from "./Docs";
import type LanguageCode from "./LanguageCode";

type Translations = Record<LanguageCode, string>;
export default Translations;


export const TRANSLATE = "Name TBD";
export const WRITE = "Documentation TBD";

export const WRITE_DOCS = {
    eng: WRITE,
    "😀": WRITE
}

export function overrideWithDocs(translations: Translations, docs: Docs) {

    // Override with documentation, if available.
    for(const doc of docs.docs) {
        const lang = doc.getLanguage();
        if(lang !== undefined)
        translations[lang as LanguageCode] = doc.docs.getText();
    }
    return translations;
    
}