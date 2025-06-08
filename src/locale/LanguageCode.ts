import { EMOJI_SYMBOL } from '@parser/Symbols';
import { TextCloseByTextOpen } from '@parser/Tokenizer';
import type Locale from './Locale';
import type { RegionCode } from './Regions';
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
    /** Specify scripts that the language uses */
    scripts: Script[];
    /** Specify regions that the language is typically used in (and to which it can be translated) */
    regions: RegionCode[];
};

/** Languages not supported by Google Translate */
export const Untranslatable = [
    EMOJI_SYMBOL,
    'bo',
    'fo',
    'ii',
    'iu',
    'syc',
    'wo',
];

/** BCP 47 language tags and other metadata. */
export const Languages = {
    '😀': { name: 'Emoji', en: 'Emoji', scripts: ['Emoj'], regions: [] },
    af: { name: 'Afrikaans', en: 'Afrikaans', scripts: ['Latn'], regions: [] },
    am: { name: 'አማርኛ', en: 'Amharic', scripts: ['Ethi'], regions: [] },
    ar: { name: 'العربية', en: 'Arabic', scripts: ['Arab'], regions: [] },
    as: { name: 'অসমীয়া', en: 'Assamese', scripts: ['Brah'], regions: [] },
    az: {
        name: 'Azərbaycan­lı',
        en: 'Azerbaijani',
        scripts: ['Latn'],
        regions: [],
    },
    ba: { name: 'Башҡорт', en: 'Bashkir', scripts: ['Arab'], regions: [] },
    be: {
        name: 'беларуская',
        en: 'Belarusian',
        quote: '«',
        secondary: '„',
        scripts: ['Arab'],
        regions: [],
    },
    bg: {
        name: 'български',
        en: 'Bulgarian',
        quote: '«',
        secondary: "'",
        scripts: ['Cyrl'],
        regions: [],
    },
    bn: { name: 'বাংলা', en: 'Bengali', scripts: ['Brah'], regions: [] },
    bo: { name: 'བོད་ཡིག', en: 'Tibetan', scripts: ['Phag'], regions: [] },
    br: { name: 'brezhoneg', en: 'Breton', scripts: ['Latn'], regions: [] },
    bs: {
        name: 'bosanski/босански',
        en: 'Bosnian',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: [],
    },
    ca: {
        name: 'català',
        en: 'Catalan',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: [],
    },
    co: { name: 'Corsu', en: 'Corsican', scripts: ['Latn'], regions: [] },
    cs: { name: 'čeština', en: 'Czech', scripts: ['Latn'], regions: [] },
    cy: { name: 'Cymraeg', en: 'Welsh', scripts: ['Latn'], regions: [] },
    da: {
        name: 'dansk',
        en: 'Danish',
        quote: '»',
        scripts: ['Latn'],
        regions: [],
    },
    de: {
        name: 'Deutsch',
        en: 'German',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
        regions: [],
    },
    el: {
        name: 'ελληνικά',
        en: 'Greek',
        quote: '«',
        secondary: "'",
        scripts: ['Grek'],
        regions: [],
    },
    en: {
        name: 'English',
        en: 'English',
        scripts: ['Latn'],
        regions: ['US', 'GB'],
    },
    es: {
        name: 'español',
        en: 'Spanish',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: [],
    },
    et: {
        name: 'eesti',
        en: 'Estonian',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: [],
    },
    eu: { name: 'euskara', en: 'Basque', scripts: ['Latn'], regions: [] },
    fa: { name: 'فارسى', en: 'Persian', scripts: ['Arab'], regions: [] },
    fi: { name: 'suomi', en: 'Finnish', scripts: ['Latn'], regions: [] },
    fil: { name: 'Filipino', en: 'Filipino', scripts: ['Latn'], regions: [] },
    fo: { name: 'føroyskt', en: 'Faroese', scripts: ['Latn'], regions: [] },
    fr: {
        name: 'français',
        en: 'French',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
        regions: [],
    },
    fy: { name: 'Frysk', en: 'Frisian', scripts: ['Latn'], regions: [] },
    ga: { name: 'Gaeilge', en: 'Irish', scripts: ['Latn'], regions: [] },
    gd: {
        name: 'Gàidhlig',
        en: 'Scottish Gaelic',
        scripts: ['Latn'],
        regions: [],
    },
    gl: { name: 'galego', en: 'Galician', scripts: ['Latn'], regions: [] },
    gu: { name: 'ગુજરાતી', en: 'Gujarati', scripts: ['Gujr'], regions: [] },
    ha: { name: 'Hausa', en: 'Hausa', scripts: ['Latn'], regions: [] },
    he: { name: 'עברית', en: 'Hebrew', scripts: ['Hebr'], regions: [] },
    hi: { name: 'हिंदी', en: 'Hindi', scripts: ['Deva'], regions: [] },
    hr: {
        name: 'hrvatski',
        en: 'Croatian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: [],
    },
    hu: {
        name: 'magyar',
        en: 'Hungarian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: [],
    },
    hy: { name: 'Հայերեն', en: 'Armenian', scripts: ['Armn'], regions: [] },
    id: {
        name: 'Bahasa Indonesia',
        en: 'Indonesian',
        scripts: ['Latn'],
        regions: [],
    },
    ig: { name: 'Igbo', en: 'Igbo', scripts: ['Latn'], regions: [] },
    ii: { name: 'ꆈꌠꁱꂷ', en: 'Yi', scripts: ['Yiii'], regions: [] },
    is: { name: 'íslenska', en: 'Icelandic', scripts: ['Latn'], regions: [] },
    it: { name: 'italiano', en: 'Italian', scripts: ['Latn'], regions: [] },
    iu: {
        name: 'Inuktitut /ᐃᓄᒃᑎᑐᑦ (ᑲᓇᑕ)',
        en: 'Inuktitut',
        scripts: ['Cans'],
        regions: [],
    },
    ja: {
        name: '日本語',
        en: 'Japanese',
        quote: '「',
        secondary: '『',
        scripts: ['Hira', 'Kana', 'Kana'],
        regions: [],
    },
    ka: { name: 'ქართული', en: 'Georgian', scripts: ['Geor'], regions: [] },
    kk: {
        name: 'Қазақша',
        en: 'Kazakh',
        scripts: ['Arab', 'Cyrl'],
        regions: [],
    },
    km: { name: 'ខ្មែរ', en: 'Khmer', scripts: ['Khmr'], regions: [] },
    kn: { name: 'ಕನ್ನಡ', en: 'Kannada', scripts: ['Knda'], regions: [] },
    ko: {
        name: '한국어',
        en: 'Korean',
        scripts: ['Kore', 'Hang', 'Hani'],
        regions: [],
    },
    gom: { name: 'कोंकणी', en: 'Konkani', scripts: ['Deva'], regions: [] },
    ky: { name: 'Кыргыз', en: 'Kyrgyz', scripts: ['Cyrl'], regions: [] },
    lb: {
        name: 'Lëtzebuergesch',
        en: 'Luxembourgish',
        scripts: ['Latn'],
        regions: [],
    },
    lo: { name: 'ລາວ', en: 'Lao', scripts: ['Laoo'], regions: [] },
    lt: {
        name: 'lietuvių',
        en: 'Lithuanian',
        quote: '„',
        scripts: ['Latn'],
        regions: [],
    },
    lv: { name: 'latviešu', en: 'Latvian', scripts: ['Latn'], regions: [] },
    mi: { name: 'Reo Māori', en: 'Maori', scripts: ['Latn'], regions: [] },
    mk: {
        name: 'македонски јазик',
        en: 'Macedonian',
        scripts: ['Cyrl'],
        regions: [],
    },
    ml: {
        name: 'മലയാളം',
        en: 'Malayalam',
        scripts: ['Mlym', 'Latn'],
        regions: [],
    },
    mn: {
        name: 'Монгол хэл/ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ',
        en: 'Mongolian',
        scripts: ['Mong'],
        regions: [],
    },
    mr: { name: 'मराठी', en: 'Marathi', scripts: ['Deva'], regions: [] },
    ms: {
        name: 'Bahasa Malaysia',
        en: 'Malay',
        scripts: ['Latn'],
        regions: [],
    },
    mt: { name: 'Malti', en: 'Maltese', scripts: ['Latn'], regions: [] },
    my: { name: 'Myanmar', en: 'Burmese', scripts: ['Mymr'], regions: [] },
    ne: {
        name: 'नेपाली (नेपाल)',
        en: 'Nepali',
        scripts: ['Deva'],
        regions: [],
    },
    nl: { name: 'Nederlands', en: 'Dutch', scripts: ['Latn'], regions: [] },
    no: { name: 'norsk', en: 'Norwegian', scripts: ['Latn'], regions: [] },
    oc: { name: 'Occitan', en: 'Occitan', scripts: ['Latn'], regions: [] },
    pa: { name: 'ਪੰਜਾਬੀ', en: 'Punjabi', scripts: ['Guru'], regions: [] },
    pl: {
        name: 'polski',
        en: 'Polish',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: [],
    },
    ps: { name: 'پښتو', en: 'Pashto', scripts: ['Arab'], regions: [] },
    pt: {
        name: 'Português',
        en: 'Portuguese',
        quote: '»',
        secondary: '"',
        scripts: ['Latn'],
        regions: [],
    },
    qu: { name: 'runasimi', en: 'Quechua', scripts: ['Latn'], regions: [] },
    rm: { name: 'Rumantsch', en: 'Romansh', scripts: ['Latn'], regions: [] },
    ro: {
        name: 'română',
        en: 'Romanian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: [],
    },
    ru: {
        name: 'русский',
        en: 'Russian',
        quote: '«',
        scripts: ['Cyrl'],
        regions: [],
    },
    rw: {
        name: 'Kinyarwanda',
        en: 'Kinyarwanda',
        scripts: ['Latn'],
        regions: [],
    },
    sa: { name: 'संस्कृत', en: 'Sanskrit', scripts: ['Deva'], regions: [] },
    si: { name: 'සිංහල', en: 'Sinhala', scripts: ['Sinh'], regions: [] },
    sk: { name: 'slovenčina', en: 'Slovak', scripts: ['Latn'], regions: [] },
    sl: {
        name: 'slovenski',
        en: 'Slovenian',
        quote: '„',
        scripts: ['Latn'],
        regions: [],
    },
    sq: { name: 'shqipe', en: 'Albanian', scripts: ['Latn'], regions: [] },
    sr: {
        name: 'srpski/српски',
        en: 'Serbian',
        scripts: ['Cyrl'],
        regions: [],
    },
    sv: {
        name: 'svenska',
        en: 'Swedish',
        quote: '”',
        scripts: ['Latn'],
        regions: [],
    },
    sw: { name: 'Kiswahili', en: 'Swahili', scripts: ['Latn'], regions: [] },
    syc: { name: 'ܣܘܪܝܝܐ', en: 'Syriac', scripts: ['Syrc'], regions: [] },
    ta: { name: 'தமிழ்', en: 'Tamil', scripts: ['Taml'], regions: [] },
    te: { name: 'తెలుగు', en: 'Telugu', scripts: ['Telu'], regions: [] },
    tg: { name: 'Тоҷикӣ', en: 'Tajik', scripts: ['Cyrl'], regions: [] },
    th: { name: 'ไทย', en: 'Thai', scripts: ['Thai'], regions: [] },
    tl: { name: 'ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔', en: 'Tagalog', scripts: ['Latn'], regions: [] },
    tn: { name: 'Setswana', en: 'Tswana', scripts: ['Latn'], regions: [] },
    tr: { name: 'Türkçe', en: 'Turkish', scripts: ['Latn'], regions: [] },
    tt: { name: 'Татарча', en: 'Tatar', scripts: ['Arab'], regions: [] },
    ug: { name: 'ئۇيغۇرچە', en: 'Uyghur', scripts: ['Arab'], regions: [] },
    uk: {
        name: 'українська',
        en: 'Ukrainian',
        quote: '«',
        secondary: '„',
        scripts: ['Cyrl'],
        regions: [],
    },
    ur: { name: 'اُردو', en: 'Urdu', scripts: ['Arab'], regions: [] },
    uz: { name: "U'zbek/Ўзбек", en: 'Uzbek', scripts: ['Arab'], regions: [] },
    vi: {
        name: 'Tiếng Việt/㗂越',
        en: 'Vietnamese',
        scripts: ['Hani'],
        regions: [],
    },
    wo: { name: 'Wolof', en: 'Wolof', scripts: ['Latn'], regions: [] },
    xh: { name: 'isiXhosa', en: 'Xhosa', scripts: ['Latn'], regions: [] },
    yo: { name: 'Yoruba', en: 'Yoruba', scripts: ['Latn'], regions: [] },
    zh: {
        name: '中文',
        en: 'Chinese',
        quote: '「',
        secondary: '『',
        scripts: ['Hani'],
        regions: ['CN', 'TW'],
    },
    zu: { name: 'isiZulu', en: 'Zulu', scripts: ['Latn'], regions: [] },
} satisfies Record<string, LanguageMetadata>;

type LanguageCode = keyof typeof Languages;
export { type LanguageCode as default };

export const PossibleLanguages: LanguageCode[] = Object.keys(
    Languages,
) as LanguageCode[];

export const TranslatableLocales: Locale[] = (
    Object.entries(Languages) as [LanguageCode, LanguageMetadata][]
)
    .filter(([language]) => !Untranslatable.includes(language))
    .map(([language, info]) =>
        info.regions.length === 0
            ? { language, regions: [] }
            : info.regions.map((region) => ({ language, regions: [region] })),
    )
    .flat();

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

export function getLanguageScripts(code: LanguageCode): Script[] {
    return Languages[code].scripts;
}
