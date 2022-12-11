type LanguageCode = ("eng" | "😀");

export const languageCodeToLanguage: Record<LanguageCode, string> = {
    eng: "English",
    "😀": "😀"
}

export const SupportedLanguages: LanguageCode[] = [ "eng" ];

export default LanguageCode;