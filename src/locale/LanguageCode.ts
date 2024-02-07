import { TextCloseByTextOpen } from '@parser/Tokenizer';
import {
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
    /** Optionally deviate from the default of ' for text */
    quote?: string;
    /** Optionally deviate from the default of " for secondary internal quotes */
    secondary?: string;
    /** Specify scripots that the language uses */
    scripts: Script[];
};

/** BCP 47 language tags and other metadata. */
export const Languages = {
    '😀': { name: 'Emoji', en: 'Emoji', scripts: ['Emoj'] },
    af: { name: 'Afrikaans', en: 'Afrikaans', scripts: ['Latn'] },
    am: { name: 'አማርኛ', en: 'Amharic', scripts: ['Ethi'] },
    ar: { name: 'العربية', en: 'Arabic', scripts: ['Arab'] },
    as: { name: 'অসমীয়া', en: 'Assamese', scripts: ['Brah'] },
    az: { name: 'Azərbaycan­lı', en: 'Azerbaijani', scripts: ['Latn'] },
    ba: { name: 'Башҡорт', en: 'Bashkir', scripts: ['Arab'] },
    be: {
        name: 'беларуская',
        en: 'Belarusian',
        quote: '«',
        secondary: '„',
        scripts: ['Arab'],
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
    br: { name: 'brezhoneg', en: 'Breton', scripts: ['Latn'] },
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
        scripts: ['Latn'],
    },
    co: { name: 'Corsu', en: 'Corsican', scripts: ['Latn'] },
    cs: { name: 'čeština', en: 'Czech', scripts: ['Latn'] },
    cy: { name: 'Cymraeg', en: 'Welsh', scripts: ['Latn'] },
    da: { name: 'dansk', en: 'Danish', quote: '»', scripts: ['Latn'] },
    de: {
        name: 'Deutsch',
        en: 'German',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
    },
    el: {
        name: 'ελληνικά',
        en: 'Greek',
        quote: '«',
        secondary: "'",
        scripts: ['Grek'],
    },
    en: { name: 'English', en: 'English', scripts: ['Latn'] },
    es: {
        name: 'español',
        en: 'Spanish',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
    },
    et: {
        name: 'eesti',
        en: 'Estonian',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
    },
    eu: { name: 'euskara', en: 'Basque', scripts: ['Latn'] },
    fa: { name: 'فارسى', en: 'Persian', scripts: ['Arab'] },
    fi: { name: 'suomi', en: 'Finnish', scripts: ['Latn'] },
    fil: { name: 'Filipino', en: 'Filipino', scripts: ['Latn'] },
    fo: { name: 'føroyskt', en: 'Faroese', scripts: ['Latn'] },
    fr: {
        name: 'français',
        en: 'French',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
    },
    fy: { name: 'Frysk', en: 'Frisian', scripts: ['Latn'] },
    ga: { name: 'Gaeilge', en: 'Irish', scripts: ['Latn'] },
    gd: { name: 'Gàidhlig', en: 'Scottish Gaelic', scripts: ['Latn'] },
    gl: { name: 'galego', en: 'Galician', scripts: ['Latn'] },
    ha: { name: 'Hausa', en: 'Hausa', scripts: ['Latn'] },
    he: { name: 'עברית', en: 'Hebrew', scripts: ['Hebr'] },
    hi: { name: 'हिंदी', en: 'Hindi', scripts: ['Deva'] },
    hr: {
        name: 'hrvatski',
        en: 'Croatian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
    },
    hu: {
        name: 'magyar',
        en: 'Hungarian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
    },
    hy: { name: 'Հայերեն', en: 'Armenian', scripts: ['Armn'] },
    id: { name: 'Bahasa Indonesia', en: 'Indonesian', scripts: ['Latn'] },
    ig: { name: 'Igbo', en: 'Igbo', scripts: ['Latn'] },
    ii: { name: 'ꆈꌠꁱꂷ', en: 'Yi', scripts: ['Yiii'] },
    is: { name: 'íslenska', en: 'Icelandic', scripts: ['Latn'] },
    it: { name: 'italiano', en: 'Italian', scripts: ['Latn'] },
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
    lb: { name: 'Lëtzebuergesch', en: 'Luxembourgish', scripts: ['Latn'] },
    lo: { name: 'ລາວ', en: 'Lao', scripts: ['Laoo'] },
    lt: { name: 'lietuvių', en: 'Lithuanian', quote: '„', scripts: ['Latn'] },
    lv: { name: 'latviešu', en: 'Latvian', scripts: ['Latn'] },
    mi: { name: 'Reo Māori', en: 'Maori', scripts: ['Latn'] },
    mk: { name: 'македонски јазик', en: 'Macedonian', scripts: ['Cyrl'] },
    ml: { name: 'മലയാളം', en: 'Malayalam', scripts: ['Mlym', 'Latn'] },
    mn: {
        name: 'Монгол хэл/ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ',
        en: 'Mongolian',
        scripts: ['Mong'],
    },
    mr: { name: 'मराठी', en: 'Marathi', scripts: ['Deva'] },
    ms: { name: 'Bahasa Malaysia', en: 'Malay', scripts: ['Latn'] },
    mt: { name: 'Malti', en: 'Maltese', scripts: ['Latn'] },
    my: { name: 'Myanmar', en: 'Burmese', scripts: ['Mymr'] },
    ne: { name: 'नेपाली (नेपाल)', en: 'Nepali', scripts: ['Deva'] },
    nl: { name: 'Nederlands', en: 'Dutch', scripts: ['Latn'] },
    no: { name: 'norsk', en: 'Norwegian', scripts: ['Latn'] },
    oc: { name: 'Occitan', en: 'Occitan', scripts: ['Latn'] },
    pa: { name: 'ਪੰਜਾਬੀ', en: 'Punjabi', scripts: ['Arab'] },
    pl: {
        name: 'polski',
        en: 'Polish',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
    },
    ps: { name: 'پښتو', en: 'Pashto', scripts: ['Arab'] },
    pt: {
        name: 'Português',
        en: 'Portuguese',
        quote: '»',
        secondary: '"',
        scripts: ['Latn'],
    },
    qu: { name: 'runasimi', en: 'Quechua', scripts: ['Latn'] },
    rm: { name: 'Rumantsch', en: 'Romansh', scripts: ['Latn'] },
    ro: {
        name: 'română',
        en: 'Romanian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
    },
    ru: { name: 'русский', en: 'Russian', quote: '«', scripts: ['Cyrl'] },
    rw: { name: 'Kinyarwanda', en: 'Kinyarwanda', scripts: ['Latn'] },
    sa: { name: 'संस्कृत', en: 'Sanskrit', scripts: ['Deva'] },
    si: { name: 'සිංහල', en: 'Sinhala', scripts: ['Sinh'] },
    sk: { name: 'slovenčina', en: 'Slovak', scripts: ['Latn'] },
    sl: { name: 'slovenski', en: 'Slovenian', quote: '„', scripts: ['Latn'] },
    sq: { name: 'shqipe', en: 'Albanian', scripts: ['Latn'] },
    sr: { name: 'srpski/српски', en: 'Serbian', scripts: ['Cyrl'] },
    sv: { name: 'svenska', en: 'Swedish', quote: '”', scripts: ['Latn'] },
    sw: { name: 'Kiswahili', en: 'Kiswahili', scripts: ['Latn'] },
    syc: { name: 'ܣܘܪܝܝܐ', en: 'Syriac', scripts: ['Syrc'] },
    ta: { name: 'தமிழ்', en: 'Tamil', scripts: ['Taml'] },
    te: { name: 'తెలుగు', en: 'Telugu', scripts: ['Telu'] },
    tg: { name: 'Тоҷикӣ', en: 'Tajik', scripts: ['Cyrl'] },
    th: { name: 'ไทย', en: 'Thai', scripts: ['Thai'] },
    tl: { name: 'ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔', en: 'Tagalog', scripts: ['Latn'] },
    tn: { name: 'Setswana', en: 'Tswana', scripts: ['Latn'] },
    tr: { name: 'Türkçe', en: 'Turkish', scripts: ['Latn'] },
    tt: { name: 'Татарча', en: 'Tatar', scripts: ['Arab'] },
    ug: { name: 'ئۇيغۇرچە', en: 'Uyghur', scripts: ['Arab'] },
    uk: {
        name: 'українська',
        en: 'Ukrainian',
        quote: '«',
        secondary: '„',
        scripts: ['Cyrl'],
    },
    ur: { name: 'اُردو', en: 'Urdu', scripts: ['Arab'] },
    uz: { name: "U'zbek/Ўзбек", en: 'Uzbek', scripts: ['Arab'] },
    vi: { name: 'Tiếng Việt/㗂越', en: 'Vietnamese', scripts: ['Hani'] },
    wo: { name: 'Wolof', en: 'Wolof', scripts: ['Latn'] },
    xh: { name: 'isiXhosa', en: 'Xhosa', scripts: ['Latn'] },
    yo: { name: 'Yoruba', en: 'Yoruba', scripts: ['Latn'] },
    zh: {
        name: '中文',
        en: 'Chinese',
        quote: '「',
        secondary: '『',
        scripts: ['Hani'],
    },
    zu: { name: 'isiZulu', en: 'Zulu', scripts: ['Latn'] },
} satisfies Record<string, LanguageMetadata>;

type LanguageCode = keyof typeof Languages;
export { type LanguageCode as default };

export const PossibleLanguages: LanguageCode[] = Object.keys(
    Languages,
) as LanguageCode[];

export function getLanguageName(code: LanguageCode): string | undefined {
    return Languages[code]?.name;
}

export function getLanguageQuoteOpen(code: LanguageCode): string {
    return (Languages[code] as LanguageMetadata)?.quote ?? "'";
}

export function getLanguageQuoteClose(code: LanguageCode): string {
    return (
        TextCloseByTextOpen[getLanguageQuoteOpen(code)] ??
        getLanguageQuoteOpen(code)
    );
}

export function getLanguageSecondaryQuote(code: LanguageCode): string {
    return (Languages[code] as LanguageMetadata)?.secondary ?? '"';
}

export function getLanguageDirection(code: LanguageCode): WritingDirection {
    return Scripts[Languages[code].scripts[0]].direction ?? 'ltr';
}

export function getLanguageLayout(code: LanguageCode): WritingLayout {
    return Scripts[Languages[code].scripts[0]]?.layout ?? 'horizontal-tb';
}
