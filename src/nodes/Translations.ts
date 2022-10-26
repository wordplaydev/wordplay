import type LanguageCode from "./LanguageCode";

type Translations = Record<LanguageCode, string>;
export default Translations;


export const TRANSLATE = "Name TBD";
export const WRITE = "Documentation TBD";

export const WRITE_DOCS = {
    eng: WRITE,
    "😀": WRITE
}