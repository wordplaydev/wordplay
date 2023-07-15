type LanguageMetadata = {
    /** The language name, in its native script */
    name: string;
    /** The English name, in case we need it */
    en: string;
    /** Optionally deviate from the default of single quotes for text */
    quote?: string;
    /** Optionally deviate from the default of double quotes for secondary internal quotes */
    secondary?: string;
    /** Specify writing mode for a language, one of three defined in CSS. Defaults to horizontal-tb. */
    layout?: WritingLayout | undefined;
    /** Specify direction of text in blocks. If unspecified, it's ltr. */
    direction?: WritingDirection | undefined;
};

export type WritingLayout = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
export type WritingDirection = 'ltr' | 'rtl';

/** BCP 47 language tags and other metadata. */
export const Languages: Record<string, LanguageMetadata> = {
    af: { name: 'Afrikaans', en: 'Afrikaans' },
    am: { name: 'አማርኛ', en: 'Amharic' },
    ar: { name: 'العربية', en: 'Arabic', direction: 'rtl' },
    arn: { name: 'Mapudungun', en: 'Mapudungun' },
    as: { name: 'অসমীয়া', en: 'Assamese' },
    az: { name: 'Azərbaycan­lı', en: 'Azerbaijani' },
    ba: { name: 'Башҡорт', en: 'Bashkir' },
    be: { name: 'беларуская', en: 'Belarusian', quote: '«', secondary: '„' },
    bg: { name: 'български', en: 'Bulgarian', quote: '«', secondary: "'" },
    bn: { name: 'বাংলা', en: 'Bengali' },
    bo: { name: 'བོད་ཡིག', en: 'Tibetan' },
    br: { name: 'brezhoneg', en: 'Breton' },
    bs: { name: 'bosanski/босански', en: 'Bosnian' },
    ca: { name: 'català', en: 'Catalan', quote: '«', secondary: '"' },
    co: { name: 'Corsu', en: 'Corsican' },
    cs: { name: 'čeština', en: 'Czech' },
    cy: { name: 'Cymraeg', en: 'Welsh' },
    da: { name: 'dansk', en: 'Danish', quote: '»' },
    de: { name: 'Deutsch', en: 'German', quote: '«', secondary: '‹' },
    dsb: { name: 'dolnoserbšćina', en: 'Lower Sorbian' },
    dv: { name: 'ދިވެހިބަސް', en: 'Divehi' },
    el: { name: 'ελληνικά', en: 'Greek', quote: '«', secondary: "'" },
    en: { name: 'English', en: 'English' },
    es: { name: 'español', en: 'Spanish', quote: '«', secondary: '"' },
    et: { name: 'eesti', en: 'Estonian', quote: '«', secondary: '"' },
    eu: { name: 'euskara', en: 'Basque' },
    fa: { name: 'فارسى', en: 'Persian', direction: 'rtl' },
    fi: { name: 'suomi', en: 'Finnish' },
    fil: { name: 'Filipino', en: 'Filipino' },
    fo: { name: 'føroyskt', en: 'Faroese' },
    fr: { name: 'français', en: 'French', quote: '«', secondary: '‹' },
    fy: { name: 'Frysk', en: 'Frisian' },
    ga: { name: 'Gaeilge', en: 'Irish' },
    gd: { name: 'Gàidhlig', en: 'Scottish Gaelic' },
    gl: { name: 'galego', en: 'Galician' },
    gsw: { name: 'Elsässisch', en: 'Alsatian' },
    gu: { name: 'ગુજરાતી', en: 'Gujarati' },
    ha: { name: 'Hausa', en: 'Hausa' },
    he: { name: 'עברית', en: 'Hebrew', direction: 'rtl' },
    hi: { name: 'हिंदी', en: 'Hindi' },
    hr: { name: 'hrvatski', en: 'Croatian', quote: '„', secondary: '»' },
    hsb: { name: 'hornjoserbšćina', en: 'Upper Sorbian' },
    hu: { name: 'magyar', en: 'Hungarian', quote: '„', secondary: '»' },
    hy: { name: 'Հայերեն', en: 'Armenian' },
    id: { name: 'Bahasa Indonesia', en: 'Indonesian' },
    ig: { name: 'Igbo', en: 'Igbo' },
    ii: { name: 'ꆈꌠꁱꂷ', en: 'Yi' },
    is: { name: 'íslenska', en: 'Icelandic' },
    it: { name: 'italiano', en: 'Italian' },
    iu: { name: 'Inuktitut /ᐃᓄᒃᑎᑐᑦ (ᑲᓇᑕ)', en: 'Inuktitut' },
    ja: {
        name: '日本語',
        en: 'Japanese',
        quote: '「',
        secondary: '『',
        direction: 'rtl',
        layout: 'vertical-rl',
    },
    ka: { name: 'ქართული', en: 'Georgian' },
    kk: { name: 'Қазақша', en: 'Kazakh' },
    kl: { name: 'kalaallisut', en: 'Greenlandic' },
    km: { name: 'ខ្មែរ', en: 'Khmer' },
    kn: { name: 'ಕನ್ನಡ', en: 'Kannada' },
    ko: {
        name: '한국어/韓國語',
        en: 'Korean',
        direction: 'rtl',
        layout: 'vertical-rl',
    },
    kok: { name: 'कोंकणी', en: 'Konkani' },
    ky: { name: 'Кыргыз', en: 'Kyrgyz' },
    lb: { name: 'Lëtzebuergesch', en: 'Luxembourgish' },
    lo: { name: 'ລາວ', en: 'Lao' },
    lt: { name: 'lietuvių', en: 'Lithuanian', quote: '„' },
    lv: { name: 'latviešu', en: 'Latvian' },
    mi: { name: 'Reo Māori', en: 'Maori' },
    mk: { name: 'македонски јазик', en: 'Macedonian' },
    ml: { name: 'മലയാളം', en: 'Malayalam' },
    mn: {
        name: 'Монгол хэл/ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ',
        en: 'Mongolian',
        layout: 'vertical-lr',
    },
    moh: { name: "Kanien'kéha", en: 'Mohawk' },
    mr: { name: 'मराठी', en: 'Marathi' },
    ms: { name: 'Bahasa Malaysia', en: 'Malay' },
    mt: { name: 'Malti', en: 'Maltese' },
    my: { name: 'Myanmar', en: 'Burmese' },
    nb: { name: 'norsk (bokmål)', en: 'Norwegian (Bokmål)' },
    ne: { name: 'नेपाली (नेपाल)', en: 'Nepali' },
    nl: { name: 'Nederlands', en: 'Dutch' },
    nn: { name: 'norsk (nynorsk)', en: 'Norwegian (Nynorsk)' },
    no: { name: 'norsk', en: 'Norwegian' },
    st: { name: 'Sesotho sa Leboa', en: 'Sesotho' },
    oc: { name: 'Occitan', en: 'Occitan' },
    or: { name: 'ଓଡ଼ିଆ', en: 'Odia' },
    pa: { name: 'ਪੰਜਾਬੀ', en: 'Punjabi' },
    pl: { name: 'polski', en: 'Polish', quote: '„', secondary: '»' },
    prs: { name: 'درى', en: 'Dari' },
    ps: { name: 'پښتو', en: 'Pashto' },
    pt: { name: 'Português', en: 'Portuguese', quote: '»', secondary: '"' },
    quc: { name: "K'iche", en: "K'iche" },
    qu: { name: 'runasimi', en: 'Quechua' },
    rm: { name: 'Rumantsch', en: 'Romansh' },
    ro: { name: 'română', en: 'Romanian', quote: '„', secondary: '»' },
    ru: { name: 'русский', en: 'Russian', quote: '«' },
    rw: { name: 'Kinyarwanda', en: 'Kinyarwanda' },
    sa: { name: 'संस्कृत', en: 'Sanskrit' },
    sah: { name: 'саха', en: 'Yakut' },
    se: { name: 'davvisámegiella', en: 'Sami (Northern)' },
    si: { name: 'සිංහල', en: 'Sinhala' },
    sk: { name: 'slovenčina', en: 'Slovak' },
    sl: { name: 'slovenski', en: 'Slovenian', quote: '„' },
    sma: { name: 'åarjelsaemiengiele', en: 'Sami (Southern)' },
    smj: { name: 'julevusámegiella', en: 'Sami (Lule)' },
    smn: { name: 'sämikielâ', en: 'Sami (Inari)' },
    sms: { name: 'sääm´ǩiõll', en: 'Sami (Skolt)' },
    sq: { name: 'shqipe', en: 'Albanian' },
    sr: { name: 'srpski/српски', en: 'Serbian' },
    sv: { name: 'svenska', en: 'Swedish', quote: '”' },
    sw: { name: 'Kiswahili', en: 'Kiswahili' },
    syc: { name: 'ܣܘܪܝܝܐ', en: 'Syriac', direction: 'rtl' },
    ta: { name: 'தமிழ்', en: 'Tamil' },
    te: { name: 'తెలుగు', en: 'Telugu' },
    tg: { name: 'Тоҷикӣ', en: 'Tajik' },
    th: { name: 'ไทย', en: 'Thai' },
    tk: { name: 'türkmençe', en: 'Turkmen' },
    tn: { name: 'Setswana', en: 'Tswana' },
    tr: { name: 'Türkçe', en: 'Turkish' },
    tt: { name: 'Татарча', en: 'Tatar' },
    tzm: { name: 'Tamazight', en: 'Tamazight' },
    ug: { name: 'ئۇيغۇرچە', en: 'Uyghur' },
    uk: { name: 'українська', en: 'Ukrainian', quote: '«', secondary: '„' },
    ur: { name: 'اُردو', en: 'Urdu' },
    uz: { name: "U'zbek/Ўзбек", en: 'Uzbek' },
    vi: { name: 'Tiếng Việt/㗂越', en: 'Vietnamese' },
    wo: { name: 'Wolof', en: 'Wolof' },
    xh: { name: 'isiXhosa', en: 'Xhosa' },
    yo: { name: 'Yoruba', en: 'Yoruba' },
    zh: {
        name: '中文',
        en: 'Chinese',
        quote: '「',
        secondary: '『',
        direction: 'rtl',
        layout: 'vertical-rl',
    },
    zu: { name: 'isiZulu', en: 'Zulu' },
};

type LanguageCode = keyof typeof Languages;
export default LanguageCode;

export function getLanguageName(code: LanguageCode): string | undefined {
    return Languages[code]?.name;
}

export function getLanguageQuote(code: LanguageCode): string | undefined {
    return Languages[code]?.quote ?? "'";
}
