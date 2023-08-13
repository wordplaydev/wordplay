import {
    Arab,
    Latin,
    Scripts,
    type Script,
    type WritingDirection,
    type WritingLayout,
} from './Scripts';

type LanguageMetadata = {
    /** The language name, in its basis script */
    name: string;
    /** The English name, in case we need it */
    en: string;
    /** Optionally deviate from the default of single quotes for text */
    quote?: string;
    /** Optionally deviate from the default of double quotes for secondary internal quotes */
    secondary?: string;
    /** Specify scripots that the language uses */
    scripts: Script[];
};

/** BCP 47 language tags and other metadata. */
export const Languages = {
    '😀': { name: 'Emoji', en: 'Emoji', scripts: ['Emoj'] },
    af: { name: 'Afrikaans', en: 'Afrikaans', scripts: Latin },
    am: { name: 'አማርኛ', en: 'Amharic', scripts: ['Ethi'] },
    ar: { name: 'العربية', en: 'Arabic', scripts: Arab },
    as: { name: 'অসমীয়া', en: 'Assamese', scripts: ['Brah'] },
    az: { name: 'Azərbaycan­lı', en: 'Azerbaijani', scripts: Latin },
    ba: { name: 'Башҡорт', en: 'Bashkir', scripts: Arab },
    be: {
        name: 'беларуская',
        en: 'Belarusian',
        quote: '«',
        secondary: '„',
        scripts: Arab,
    },
    bg: {
        name: 'български',
        en: 'Bulgarian',
        quote: '«',
        secondary: "'",
        scripts: ['Cyrl'],
    },
    bn: { name: 'বাংলা', en: 'Bengali', scripts: ['Brah'] },
    bo: { name: 'བོད་ཡིག', en: 'Tibetan', scripts: ['Phag'] },
    br: { name: 'brezhoneg', en: 'Breton', scripts: Latin },
    bs: {
        name: 'bosanski/босански',
        en: 'Bosnian',
        scripts: ['Latn', 'Cyrl', 'Arab'],
    },
    ca: {
        name: 'català',
        en: 'Catalan',
        quote: '«',
        secondary: '"',
        scripts: Latin,
    },
    co: { name: 'Corsu', en: 'Corsican', scripts: Latin },
    cs: { name: 'čeština', en: 'Czech', scripts: Latin },
    cy: { name: 'Cymraeg', en: 'Welsh', scripts: Latin },
    da: { name: 'dansk', en: 'Danish', quote: '»', scripts: Latin },
    de: {
        name: 'Deutsch',
        en: 'German',
        quote: '«',
        secondary: '‹',
        scripts: Latin,
    },
    el: {
        name: 'ελληνικά',
        en: 'Greek',
        quote: '«',
        secondary: "'",
        scripts: ['Grek'],
    },
    en: { name: 'English', en: 'English', scripts: Latin },
    es: {
        name: 'español',
        en: 'Spanish',
        quote: '«',
        secondary: '"',
        scripts: Latin,
    },
    et: {
        name: 'eesti',
        en: 'Estonian',
        quote: '«',
        secondary: '"',
        scripts: Latin,
    },
    eu: { name: 'euskara', en: 'Basque', scripts: Latin },
    fa: { name: 'فارسى', en: 'Persian', scripts: Arab },
    fi: { name: 'suomi', en: 'Finnish', scripts: Latin },
    fil: { name: 'Filipino', en: 'Filipino', scripts: Latin },
    fo: { name: 'føroyskt', en: 'Faroese', scripts: Latin },
    fr: {
        name: 'français',
        en: 'French',
        quote: '«',
        secondary: '‹',
        scripts: Latin,
    },
    fy: { name: 'Frysk', en: 'Frisian', scripts: Latin },
    ga: { name: 'Gaeilge', en: 'Irish', scripts: Latin },
    gd: { name: 'Gàidhlig', en: 'Scottish Gaelic', scripts: Latin },
    gl: { name: 'galego', en: 'Galician', scripts: Latin },
    ha: { name: 'Hausa', en: 'Hausa', scripts: Latin },
    he: { name: 'עברית', en: 'Hebrew', scripts: ['Hebr'] },
    hi: { name: 'हिंदी', en: 'Hindi', scripts: ['Deva'] },
    hr: {
        name: 'hrvatski',
        en: 'Croatian',
        quote: '„',
        secondary: '»',
        scripts: Latin,
    },
    hu: {
        name: 'magyar',
        en: 'Hungarian',
        quote: '„',
        secondary: '»',
        scripts: Latin,
    },
    hy: { name: 'Հայերեն', en: 'Armenian', scripts: ['Armn'] },
    id: { name: 'Bahasa Indonesia', en: 'Indonesian', scripts: Latin },
    ig: { name: 'Igbo', en: 'Igbo', scripts: Latin },
    ii: { name: 'ꆈꌠꁱꂷ', en: 'Yi', scripts: ['Yiii'] },
    is: { name: 'íslenska', en: 'Icelandic', scripts: Latin },
    it: { name: 'italiano', en: 'Italian', scripts: Latin },
    iu: { name: 'Inuktitut /ᐃᓄᒃᑎᑐᑦ (ᑲᓇᑕ)', en: 'Inuktitut', scripts: ['Cans'] },
    ja: {
        name: '日本語',
        en: 'Japanese',
        quote: '「',
        secondary: '『',
        scripts: ['Hira', 'Jpan', 'Kana'],
    },
    ka: { name: 'ქართული', en: 'Georgian', scripts: ['Geor'] },
    kk: { name: 'Қазақша', en: 'Kazakh', scripts: ['Arab', 'Cyrl'] },
    km: { name: 'ខ្មែរ', en: 'Khmer', scripts: ['Khmr'] },
    kn: { name: 'ಕನ್ನಡ', en: 'Kannada', scripts: ['Knda'] },
    ko: {
        name: '한국어/韓國語',
        en: 'Korean',
        scripts: ['Kore'],
    },
    kok: { name: 'कोंकणी', en: 'Konkani', scripts: ['Deva'] },
    ky: { name: 'Кыргыз', en: 'Kyrgyz', scripts: ['Cyrl'] },
    lb: { name: 'Lëtzebuergesch', en: 'Luxembourgish', scripts: Latin },
    lo: { name: 'ລາວ', en: 'Lao', scripts: ['Laoo'] },
    lt: { name: 'lietuvių', en: 'Lithuanian', quote: '„', scripts: Latin },
    lv: { name: 'latviešu', en: 'Latvian', scripts: Latin },
    mi: { name: 'Reo Māori', en: 'Maori', scripts: Latin },
    mk: { name: 'македонски јазик', en: 'Macedonian', scripts: ['Cyrl'] },
    ml: { name: 'മലയാളം', en: 'Malayalam', scripts: ['Mlym', 'Latn'] },
    mn: {
        name: 'Монгол хэл/ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ',
        en: 'Mongolian',
        scripts: ['Mong'],
    },
    mr: { name: 'मराठी', en: 'Marathi', scripts: ['Deva'] },
    ms: { name: 'Bahasa Malaysia', en: 'Malay', scripts: Latin },
    mt: { name: 'Malti', en: 'Maltese', scripts: Latin },
    my: { name: 'Myanmar', en: 'Burmese', scripts: ['Mymr'] },
    ne: { name: 'नेपाली (नेपाल)', en: 'Nepali', scripts: ['Deva'] },
    nl: { name: 'Nederlands', en: 'Dutch', scripts: Latin },
    no: { name: 'norsk', en: 'Norwegian', scripts: Latin },
    oc: { name: 'Occitan', en: 'Occitan', scripts: Latin },
    pa: { name: 'ਪੰਜਾਬੀ', en: 'Punjabi', scripts: Arab },
    pl: {
        name: 'polski',
        en: 'Polish',
        quote: '„',
        secondary: '»',
        scripts: Latin,
    },
    ps: { name: 'پښتو', en: 'Pashto', scripts: Arab },
    pt: {
        name: 'Português',
        en: 'Portuguese',
        quote: '»',
        secondary: '"',
        scripts: Latin,
    },
    qu: { name: 'runasimi', en: 'Quechua', scripts: Latin },
    rm: { name: 'Rumantsch', en: 'Romansh', scripts: Latin },
    ro: {
        name: 'română',
        en: 'Romanian',
        quote: '„',
        secondary: '»',
        scripts: Latin,
    },
    ru: { name: 'русский', en: 'Russian', quote: '«', scripts: ['Cyrl'] },
    rw: { name: 'Kinyarwanda', en: 'Kinyarwanda', scripts: Latin },
    sa: { name: 'संस्कृत', en: 'Sanskrit', scripts: ['Deva'] },
    si: { name: 'සිංහල', en: 'Sinhala', scripts: ['Sinh'] },
    sk: { name: 'slovenčina', en: 'Slovak', scripts: Latin },
    sl: { name: 'slovenski', en: 'Slovenian', quote: '„', scripts: Latin },
    sq: { name: 'shqipe', en: 'Albanian', scripts: Latin },
    sr: { name: 'srpski/српски', en: 'Serbian', scripts: ['Cyrl'] },
    sv: { name: 'svenska', en: 'Swedish', quote: '”', scripts: Latin },
    sw: { name: 'Kiswahili', en: 'Kiswahili', scripts: Latin },
    syc: { name: 'ܣܘܪܝܝܐ', en: 'Syriac', scripts: ['Syrc'] },
    ta: { name: 'தமிழ்', en: 'Tamil', scripts: ['Taml'] },
    te: { name: 'తెలుగు', en: 'Telugu', scripts: ['Telu'] },
    tg: { name: 'Тоҷикӣ', en: 'Tajik', scripts: ['Cyrl'] },
    th: { name: 'ไทย', en: 'Thai', scripts: ['Thai'] },
    tl: { name: 'ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔', en: 'Tagalog', scripts: Latin },
    tn: { name: 'Setswana', en: 'Tswana', scripts: Latin },
    tr: { name: 'Türkçe', en: 'Turkish', scripts: Latin },
    tt: { name: 'Татарча', en: 'Tatar', scripts: Arab },
    ug: { name: 'ئۇيغۇرچە', en: 'Uyghur', scripts: Arab },
    uk: {
        name: 'українська',
        en: 'Ukrainian',
        quote: '«',
        secondary: '„',
        scripts: ['Cyrl'],
    },
    ur: { name: 'اُردو', en: 'Urdu', scripts: Arab },
    uz: { name: "U'zbek/Ўзбек", en: 'Uzbek', scripts: Arab },
    vi: { name: 'Tiếng Việt/㗂越', en: 'Vietnamese', scripts: ['Hani'] },
    wo: { name: 'Wolof', en: 'Wolof', scripts: Latin },
    xh: { name: 'isiXhosa', en: 'Xhosa', scripts: Latin },
    yo: { name: 'Yoruba', en: 'Yoruba', scripts: Latin },
    zh: {
        name: '中文',
        en: 'Chinese',
        quote: '「',
        secondary: '『',
        scripts: ['Hani'],
    },
    zu: { name: 'isiZulu', en: 'Zulu', scripts: Latin },
} satisfies Record<string, LanguageMetadata>;

type LanguageCode = keyof typeof Languages;
export default LanguageCode;

export const PossibleLanguages: LanguageCode[] = Object.keys(
    Languages
) as LanguageCode[];

export function getLanguageName(code: LanguageCode): string | undefined {
    return Languages[code]?.name;
}

export function getLanguageQuote(code: LanguageCode): string | undefined {
    return (Languages[code] as LanguageMetadata)?.quote ?? "'";
}

export function getLanguageDirection(code: LanguageCode): WritingDirection {
    return Scripts[Languages[code].scripts[0]].direction ?? 'ltr';
}

export function getLanguageLayout(code: LanguageCode): WritingLayout {
    return Scripts[Languages[code].scripts[0]]?.layout ?? 'horizontal-tb';
}
