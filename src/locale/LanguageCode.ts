import type Locale from '@locale/Locale';
import type { RegionCode } from '@locale/Regions';
import {
    Scripts,
    type Script,
    type WritingDirection,
    type WritingLayout,
} from '@locale/Scripts';
import { EMOJI_SYMBOL } from '@parser/Symbols';
import { TextCloseByTextOpen } from '@parser/Tokenizer';

type LanguageMetadata = {
    /** The language name, in its basis script */
    name: string;
    /** The English name, in case we need it */
    en: string;
    /** Optionally deviate from the default of ' for text */
    quote?: string;
    /** Optionally deviate from the default of " for secondary internal quotes */
    secondary?: string;
    /** Specify scripts that the language uses. The first entry is treated
     *  as the dominant script and drives writing direction and layout. */
    scripts: Script[];
    /** Specify regions that the language is typically used in (and to which it can be translated) */
    regions: RegionCode[];
    /** Approximate total number of speakers (first-language plus
     *  second-language), in millions. Used to rank languages when surfacing
     *  them in UI (e.g. labelling a script with the languages it writes).
     *  Omitted when no reliable count is available — those languages sort
     *  last among siblings.
     * Source for the `speakers` field on each language entry. Numbers are
     *  approximate total speakers (L1 + L2) in millions, drawn from Wikipedia's
     *  "List of languages by total number of speakers" (compiled from
     *  Ethnologue, 27th edition, 2024):
     *  https://en.wikipedia.org/wiki/List_of_languages_by_total_number_of_speakers
     *  For small or contested languages, single-language Wikipedia infoboxes
     *  (also Ethnologue-derived) were used. Counts are rounded; they're meant
     *  for relative ordering, not statistical claims.
     * */
    speakers?: number;
};

/** Languages Google Cloud Translate does not currently support. Cross-checked
 *  against https://cloud.google.com/translate/docs/languages. Google adds
 *  languages periodically — when a code here gains support, remove its line.
 *  Typed as `LanguageCode[]` so a typo here (or a code that doesn't exist in
 *  the `Languages` constant) becomes a compile-time error rather than a
 *  silent miss at runtime. */
export const Untranslatable: LanguageCode[] = [
    EMOJI_SYMBOL,
    // Constructed languages
    'ia', // Interlingua
    'ie', // Interlingue (Occidental)
    'io', // Ido
    'vo', // Volapük
    // Dead / liturgical
    'ae', // Avestan
    'cu', // Church Slavonic
    'pi', // Pali
    // African languages without coverage
    'aa', // Afar
    'ho', // Hiri Motu
    'hz', // Herero
    'kg', // Kongo
    'ki', // Kikuyu
    'kj', // Kuanyama
    'kr', // Kanuri
    'lu', // Luba-Katanga
    'nd', // North Ndebele
    'ng', // Ndonga
    've', // Venda
    'wo', // Wolof
    // Caucasus / Russian-Federation minority languages
    'kv', // Komi
    'os', // Ossetian
    // European minority languages
    'an', // Aragonese
    'gv', // Manx
    'kw', // Cornish
    'rm', // Romansh
    'sc', // Sardinian
    'se', // Northern Sami
    'wa', // Walloon
    // Americas indigenous
    'cr', // Cree
    'ik', // Inupiaq
    'iu', // Inuktitut
    'nv', // Navajo
    'oj', // Ojibwa
    // Asia / Pacific
    'bi', // Bislama
    'bo', // Tibetan
    'ch', // Chamorro
    'ii', // Yi
    'kl', // Kalaallisut (Greenlandic)
    'mh', // Marshallese
    'na', // Nauru
    'syc', // Syriac
    'to', // Tongan
    'ty', // Tahitian
    'za', // Zhuang
];

/** BCP 47 language tags and other metadata. `scripts` lists writing systems
 *  the language is actively (or historically) written in; the first entry
 *  is the dominant one. `speakers` is approximate L1+L2 speakers in
 *  millions — see the `speakers` field's JSDoc above for the source. */
export const Languages = {
    ae: {
        name: 'avesta',
        en: 'Avestan',
        scripts: ['Avst', 'Gujr'],
        regions: ['IR'],
        speakers: 0,
    },
    ab: {
        name: 'аҧсуа бызшәа',
        en: 'Abkhazian',
        scripts: ['Cyrl'],
        regions: ['GE', 'TR', 'RU'],
        speakers: 0.13,
    },
    aa: {
        name: 'Qafar af',
        en: 'Afar',
        scripts: ['Latn'],
        regions: ['ET', 'DJ', 'ER'],
        speakers: 2.6,
    },
    '😀': {
        name: 'Emoji',
        en: 'Emoji',
        scripts: ['Emoj'],
        regions: [],
        speakers: 0,
    },
    af: {
        name: 'Afrikaans',
        en: 'Afrikaans',
        scripts: ['Latn'],
        regions: ['ZA', 'NA'],
        speakers: 17,
    },
    ak: {
        name: 'Akan',
        en: 'Akan',
        scripts: ['Latn'],
        regions: ['GH', 'CI'],
        speakers: 11,
    },
    am: {
        name: 'አማርኛ',
        en: 'Amharic',
        scripts: ['Ethi'],
        regions: ['ET', 'IL'],
        speakers: 57,
    },
    an: {
        name: 'aragonés',
        en: 'Aragonese',
        scripts: ['Latn'],
        regions: ['ES'],
        speakers: 0.05,
    },
    ar: {
        name: 'العربية',
        en: 'Arabic',
        scripts: ['Arab'],
        regions: [
            'SA',
            'EG',
            'AE',
            'IQ',
            'JO',
            'KW',
            'LB',
            'LY',
            'MA',
            'OM',
            'QA',
            'SY',
            'TN',
            'YE',
            'BH',
            'DJ',
            'DZ',
            'KM',
            'MR',
            'PS',
            'SD',
            'SO',
        ],
        speakers: 380,
    },
    as: {
        name: 'অসমীয়া',
        en: 'Assamese',
        scripts: ['Beng'],
        regions: ['IN'],
        speakers: 15,
    },
    ay: {
        name: 'aymar aru',
        en: 'Aymara',
        scripts: ['Latn'],
        regions: ['BO', 'PE'],
        speakers: 2,
    },
    av: {
        name: 'авар мацӀ',
        en: 'Avaric',
        scripts: ['Cyrl'],
        regions: ['RU', 'AZ'],
        speakers: 1,
    },
    az: {
        name: 'Azərbaycan­lı',
        en: 'Azerbaijani',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: ['AZ', 'IR', 'TR', 'GE', 'RU', 'IQ'],
        speakers: 25,
    },
    ba: {
        name: 'Башҡорт',
        en: 'Bashkir',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 1.4,
    },
    be: {
        name: 'беларуская',
        en: 'Belarusian',
        quote: '«',
        secondary: '„',
        scripts: ['Cyrl', 'Latn'],
        regions: ['BY', 'RU', 'PL', 'LT', 'UA'],
        speakers: 5.1,
    },
    bg: {
        name: 'български',
        en: 'Bulgarian',
        quote: '«',
        secondary: "'",
        scripts: ['Cyrl'],
        regions: ['BG', 'MK', 'GR', 'RO', 'TR', 'RS', 'UA', 'MD'],
        speakers: 8,
    },
    bm: {
        name: 'bamanankan',
        en: 'Bambara',
        scripts: ['Latn', 'Nkoo'],
        regions: ['ML', 'BF', 'CI', 'GN', 'SN'],
        speakers: 4,
    },
    bi: {
        name: 'Bislama',
        en: 'Bislama',
        scripts: ['Latn'],
        regions: ['VU'],
        speakers: 0.01,
    },
    bh: {
        name: 'भोजपुरी',
        en: 'Bihari languages',
        scripts: ['Deva'],
        regions: ['IN', 'NP', 'MU', 'FJ', 'TT', 'GY', 'SR'],
        speakers: 51,
    },
    bn: {
        name: 'বাংলা',
        en: 'Bengali',
        scripts: ['Beng'],
        regions: ['BD', 'IN'],
        speakers: 270,
    },
    bo: {
        name: 'བོད་ཡིག',
        en: 'Tibetan',
        scripts: ['Tibt'],
        regions: ['CN', 'BT', 'NP', 'IN'],
        speakers: 6,
    },
    br: {
        name: 'brezhoneg',
        en: 'Breton',
        scripts: ['Latn'],
        regions: ['FR'],
        speakers: 0.2,
    },
    bs: {
        name: 'bosanski/босански',
        en: 'Bosnian',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: ['BA', 'RS', 'ME', 'HR'],
        speakers: 2.5,
    },
    ca: {
        name: 'català',
        en: 'Catalan',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: ['ES', 'AD', 'FR', 'IT'],
        speakers: 9,
    },
    ch: {
        name: 'Chamoru',
        en: 'Chamorro',
        scripts: ['Latn'],
        regions: ['GU', 'MP'],
        speakers: 0.06,
    },
    ce: {
        name: 'нохчийн мотт',
        en: 'Chechen',
        scripts: ['Cyrl'],
        regions: ['RU', 'TR', 'JO'],
        speakers: 1.4,
    },
    co: {
        name: 'Corsu',
        en: 'Corsican',
        scripts: ['Latn'],
        regions: ['FR', 'IT'],
        speakers: 0.15,
    },
    cr: {
        name: 'ᓀᐦᐃᔭᐍᐏᐣ',
        en: 'Cree',
        scripts: ['Cans', 'Latn'],
        regions: ['CA'],
        speakers: 0.1,
    },
    cs: {
        name: 'čeština',
        en: 'Czech',
        scripts: ['Latn'],
        regions: ['CZ', 'SK'],
        speakers: 14,
    },
    cv: {
        name: 'чӑваш чӗлхи',
        en: 'Chuvash',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 1,
    },
    cu: {
        name: 'словѣньскъ ѩзыкъ',
        en: 'Church Slavic',
        scripts: ['Cyrl', 'Glag'],
        regions: ['RU', 'BG', 'MK', 'RS', 'UA', 'BY', 'ME'],
        speakers: 0,
    },
    cy: {
        name: 'Cymraeg',
        en: 'Welsh',
        scripts: ['Latn'],
        regions: ['GB', 'AR'],
        speakers: 0.9,
    },
    da: {
        name: 'dansk',
        en: 'Danish',
        quote: '»',
        scripts: ['Latn'],
        regions: ['DK', 'GL', 'FO', 'DE'],
        speakers: 6,
    },
    de: {
        name: 'Deutsch',
        en: 'German',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
        regions: ['DE', 'AT', 'CH', 'LI', 'LU', 'BE'],
        speakers: 135,
    },
    ee: {
        name: 'Eʋegbe',
        en: 'Ewe',
        scripts: ['Latn'],
        regions: ['GH', 'TG', 'BJ'],
        speakers: 7,
    },
    dz: {
        name: 'རྫོང་ཁ',
        en: 'Dzongkha',
        scripts: ['Tibt'],
        regions: ['BT'],
        speakers: 0.6,
    },
    dv: {
        name: 'ދިވެހި',
        en: 'Divehi',
        scripts: ['Thaa', 'Latn'],
        regions: ['MV'],
        speakers: 0.34,
    },
    el: {
        name: 'ελληνικά',
        en: 'Greek',
        quote: '«',
        secondary: "'",
        scripts: ['Grek'],
        regions: ['GR', 'CY', 'AL', 'IT', 'TR'],
        speakers: 13,
    },
    en: {
        name: 'English',
        en: 'English',
        scripts: ['Latn'],
        regions: [
            'US',
            'GB',
            'CA',
            'AU',
            'NZ',
            'IE',
            'IN',
            'ZA',
            'SG',
            'NG',
            'PH',
            'KE',
            'JM',
            'TT',
        ],
        speakers: 1500,
    },
    eo: {
        name: 'Esperanto',
        en: 'Esperanto',
        scripts: ['Latn'],
        regions: [],
        speakers: 2,
    },
    es: {
        name: 'español',
        en: 'Spanish',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: [
            'ES',
            'MX',
            'AR',
            'CO',
            'PE',
            'VE',
            'CL',
            'GT',
            'EC',
            'CU',
            'BO',
            'DO',
            'HN',
            'PY',
            'SV',
            'NI',
            'CR',
            'PR',
            'PA',
            'UY',
            'US',
        ],
        speakers: 560,
    },
    et: {
        name: 'eesti',
        en: 'Estonian',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: ['EE', 'FI', 'SE', 'RU'],
        speakers: 1.1,
    },
    eu: {
        name: 'euskara',
        en: 'Basque',
        scripts: ['Latn'],
        regions: ['ES', 'FR'],
        speakers: 0.75,
    },
    fa: {
        name: 'فارسى',
        en: 'Persian',
        scripts: ['Arab'],
        regions: ['IR', 'AF', 'TJ', 'UZ', 'BH'],
        speakers: 79,
    },
    ff: {
        name: 'Fulfulde',
        en: 'Fulah',
        scripts: ['Latn', 'Arab', 'Adlm'],
        regions: [
            'SN',
            'GN',
            'ML',
            'NG',
            'CM',
            'BF',
            'NE',
            'TD',
            'SL',
            'MR',
            'GW',
            'GM',
            'CF',
        ],
        speakers: 65,
    },
    fi: {
        name: 'suomi',
        en: 'Finnish',
        scripts: ['Latn'],
        regions: ['FI', 'SE', 'NO', 'RU', 'EE'],
        speakers: 6,
    },
    fil: {
        name: 'Filipino',
        en: 'Filipino',
        scripts: ['Latn'],
        regions: ['PH'],
        speakers: 90,
    },
    fj: {
        name: 'vosa Vakaviti',
        en: 'Fijian',
        scripts: ['Latn'],
        regions: ['FJ'],
        speakers: 0.65,
    },
    fo: {
        name: 'føroyskt',
        en: 'Faroese',
        scripts: ['Latn'],
        regions: ['FO', 'DK'],
        speakers: 0.07,
    },
    fr: {
        name: 'français',
        en: 'French',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
        regions: [
            'FR',
            'CA',
            'BE',
            'CH',
            'LU',
            'MC',
            'DZ',
            'MA',
            'TN',
            'SN',
            'CI',
            'CM',
            'BF',
            'NE',
            'ML',
            'GA',
            'CD',
            'RW',
            'BI',
            'TD',
            'MG',
        ],
        speakers: 310,
    },
    fy: {
        name: 'Frysk',
        en: 'Frisian',
        scripts: ['Latn'],
        regions: ['NL', 'DE'],
        speakers: 0.5,
    },
    ga: {
        name: 'Gaeilge',
        en: 'Irish',
        scripts: ['Latn'],
        regions: ['IE', 'GB'],
        speakers: 1.7,
    },
    gd: {
        name: 'Gàidhlig',
        en: 'Scottish Gaelic',
        scripts: ['Latn'],
        regions: ['GB', 'CA'],
        speakers: 0.07,
    },
    gl: {
        name: 'galego',
        en: 'Galician',
        scripts: ['Latn'],
        regions: ['ES', 'PT'],
        speakers: 2.4,
    },
    gn: {
        name: "Avañe'ẽ",
        en: 'Guarani',
        scripts: ['Latn'],
        regions: ['PY', 'BO', 'AR', 'BR'],
        speakers: 7,
    },
    gu: {
        name: 'ગુજરાતી',
        en: 'Gujarati',
        scripts: ['Gujr'],
        regions: ['IN', 'PK', 'GB', 'UG', 'KE', 'TZ', 'ZA'],
        speakers: 62,
    },
    gv: {
        name: 'Gaelg',
        en: 'Manx',
        scripts: ['Latn'],
        regions: ['IM'],
        speakers: 0.002,
    },
    ha: {
        name: 'Hausa',
        en: 'Hausa',
        scripts: ['Latn', 'Arab'],
        regions: ['NG', 'NE', 'GH', 'CM', 'TD', 'SD', 'CI', 'BF'],
        speakers: 80,
    },
    he: {
        name: 'עברית',
        en: 'Hebrew',
        scripts: ['Hebr'],
        regions: ['IL'],
        speakers: 9,
    },
    hi: {
        name: 'हिंदी',
        en: 'Hindi',
        scripts: ['Deva'],
        regions: ['IN', 'FJ', 'MU', 'NP', 'TT', 'GY', 'SR'],
        speakers: 610,
    },
    ho: {
        name: 'Hiri Motu',
        en: 'Hiri Motu',
        scripts: ['Latn'],
        regions: ['PG'],
        speakers: 0.12,
    },
    hr: {
        name: 'hrvatski',
        en: 'Croatian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['HR', 'BA', 'RS', 'AT', 'HU', 'ME'],
        speakers: 5,
    },
    ht: {
        name: 'Kreyòl Ayisyen',
        en: 'Haitian',
        scripts: ['Latn'],
        regions: ['HT', 'DO', 'CA', 'US', 'FR', 'BS'],
        speakers: 11,
    },
    hu: {
        name: 'magyar',
        en: 'Hungarian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['HU', 'RO', 'RS', 'SK', 'UA', 'AT', 'HR', 'SI'],
        speakers: 13,
    },
    hy: {
        name: 'Հայերեն',
        en: 'Armenian',
        scripts: ['Armn'],
        regions: ['AM', 'RU', 'GE', 'LB', 'IR', 'SY', 'TR', 'US', 'FR'],
        speakers: 7,
    },
    ia: {
        name: 'Interlingua',
        en: 'Interlingua',
        scripts: ['Latn'],
        regions: [],
        speakers: 0.001,
    },
    hz: {
        name: 'Otjiherero',
        en: 'Herero',
        scripts: ['Latn'],
        regions: ['NA', 'BW', 'AO'],
        speakers: 0.2,
    },
    id: {
        name: 'Bahasa Indonesia',
        en: 'Indonesian',
        scripts: ['Latn'],
        regions: ['ID', 'TL'],
        speakers: 200,
    },
    ie: {
        name: 'Interlingue',
        en: 'Interlingue',
        scripts: ['Latn'],
        regions: [],
        speakers: 0.0001,
    },
    ig: {
        name: 'Igbo',
        en: 'Igbo',
        scripts: ['Latn'],
        regions: ['NG', 'GQ'],
        speakers: 31,
    },
    ii: {
        name: 'ꆈꌠꁱꂷ',
        en: 'Yi',
        scripts: ['Yiii'],
        regions: ['CN'],
        speakers: 2,
    },
    io: {
        name: 'Ido',
        en: 'Ido',
        scripts: ['Latn'],
        regions: [],
        speakers: 0.0001,
    },
    ik: {
        name: 'Iñupiaq',
        en: 'Inupiaq',
        scripts: ['Latn'],
        regions: ['US'],
        speakers: 0.002,
    },
    is: {
        name: 'íslenska',
        en: 'Icelandic',
        scripts: ['Latn'],
        regions: ['IS'],
        speakers: 0.4,
    },
    it: {
        name: 'italiano',
        en: 'Italian',
        scripts: ['Latn'],
        regions: ['IT', 'CH', 'SM', 'VA'],
        speakers: 68,
    },
    iu: {
        name: 'Inuktitut /ᐃᓄᒃᑎᑐᑦ (ᑲᓇᑕ)',
        en: 'Inuktitut',
        scripts: ['Cans', 'Latn'],
        regions: ['CA'],
        speakers: 0.04,
    },
    ja: {
        name: '日本語',
        en: 'Japanese',
        quote: '「',
        secondary: '『',
        scripts: ['Hira', 'Kana', 'Hani'],
        regions: ['JP'],
        speakers: 125,
    },
    jv: {
        name: 'basa Jawa',
        en: 'Javanese',
        scripts: ['Latn', 'Java'],
        regions: ['ID', 'SR'],
        speakers: 68,
    },
    ka: {
        name: 'ქართული',
        en: 'Georgian',
        scripts: ['Geor'],
        regions: ['GE', 'RU', 'TR', 'AZ', 'IR'],
        speakers: 4,
    },
    kj: {
        name: 'Kuanyama',
        en: 'Kuanyama',
        scripts: ['Latn'],
        regions: ['AO', 'NA'],
        speakers: 0.6,
    },
    ki: {
        name: 'Gĩkũyũ',
        en: 'Kikuyu',
        scripts: ['Latn'],
        regions: ['KE'],
        speakers: 9,
    },
    kg: {
        name: 'Kikongo',
        en: 'Kongo',
        scripts: ['Latn'],
        regions: ['CD', 'AO', 'CG'],
        speakers: 7,
    },
    kk: {
        name: 'Қазақша',
        en: 'Kazakh',
        scripts: ['Cyrl', 'Latn', 'Arab'],
        regions: ['KZ', 'CN', 'MN', 'RU', 'UZ', 'KG', 'TR', 'TM', 'AF'],
        speakers: 13,
    },
    kl: {
        name: 'Kalaallisut',
        en: 'Kalaallisut',
        scripts: ['Latn'],
        regions: ['GL', 'DK'],
        speakers: 0.057,
    },
    km: {
        name: 'ខ្មែរ',
        en: 'Khmer',
        scripts: ['Khmr'],
        regions: ['KH', 'TH', 'VN'],
        speakers: 17,
    },
    kn: {
        name: 'ಕನ್ನಡ',
        en: 'Kannada',
        scripts: ['Knda'],
        regions: ['IN'],
        speakers: 59,
    },
    ko: {
        name: '한국어',
        en: 'Korean',
        scripts: ['Kore', 'Hang', 'Hani'],
        regions: ['KR', 'KP', 'CN', 'JP', 'RU', 'US'],
        speakers: 82,
    },
    gom: {
        name: 'कोंकणी',
        en: 'Konkani',
        scripts: ['Deva'],
        regions: ['IN'],
        speakers: 2,
    },
    kw: {
        name: 'Kernewek',
        en: 'Cornish',
        scripts: ['Latn'],
        regions: ['GB'],
        speakers: 0.0005,
    },
    kv: {
        name: 'коми кыв',
        en: 'Komi',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 0.13,
    },
    ku: {
        name: 'Kurdî',
        en: 'Kurdish',
        scripts: ['Latn', 'Arab', 'Cyrl', 'Yezi'],
        regions: ['TR', 'IR', 'IQ', 'SY', 'AM', 'AZ', 'GE', 'LB'],
        speakers: 30,
    },
    ks: {
        name: 'कॉशुर',
        en: 'Kashmiri',
        scripts: ['Arab', 'Deva'],
        regions: ['IN', 'PK'],
        speakers: 7,
    },
    kr: {
        name: 'Kanuri',
        en: 'Kanuri',
        scripts: ['Latn', 'Arab'],
        regions: ['NG', 'NE', 'TD', 'CM'],
        speakers: 9,
    },
    ky: {
        name: 'Кыргыз',
        en: 'Kyrgyz',
        scripts: ['Cyrl', 'Arab'],
        regions: ['KG', 'CN', 'TJ', 'UZ', 'AF', 'PK', 'RU', 'TR'],
        speakers: 5,
    },
    la: {
        name: 'Latina',
        en: 'Latin',
        scripts: ['Latn'],
        regions: ['VA'],
        speakers: 0,
    },
    lb: {
        name: 'Lëtzebuergesch',
        en: 'Luxembourgish',
        scripts: ['Latn'],
        regions: ['LU', 'BE', 'DE', 'FR'],
        speakers: 0.6,
    },
    ln: {
        name: 'Lingála',
        en: 'Lingala',
        scripts: ['Latn'],
        regions: ['CD', 'CG', 'AO', 'CF'],
        speakers: 40,
    },
    li: {
        name: 'Limburgs',
        en: 'Limburgan',
        scripts: ['Latn'],
        regions: ['NL', 'BE', 'DE'],
        speakers: 1.3,
    },
    lg: {
        name: 'Luganda',
        en: 'Ganda',
        scripts: ['Latn'],
        regions: ['UG'],
        speakers: 11,
    },
    lo: {
        name: 'ລາວ',
        en: 'Lao',
        scripts: ['Laoo'],
        regions: ['LA', 'TH'],
        speakers: 30,
    },
    lt: {
        name: 'lietuvių',
        en: 'Lithuanian',
        quote: '„',
        scripts: ['Latn'],
        regions: ['LT', 'PL', 'BY', 'LV'],
        speakers: 3,
    },
    lu: {
        name: 'Tshiluba',
        en: 'Luba-Katanga',
        scripts: ['Latn'],
        regions: ['CD'],
        speakers: 6,
    },
    lv: {
        name: 'latviešu',
        en: 'Latvian',
        scripts: ['Latn'],
        regions: ['LV'],
        speakers: 2,
    },
    mh: {
        name: 'Kajin M̧ajeļ',
        en: 'Marshallese',
        scripts: ['Latn'],
        regions: ['MH'],
        speakers: 0.06,
    },
    mg: {
        name: 'fiteny malagasy',
        en: 'Malagasy',
        scripts: ['Latn'],
        regions: ['MG', 'KM', 'YT'],
        speakers: 25,
    },
    mi: {
        name: 'Reo Māori',
        en: 'Maori',
        scripts: ['Latn'],
        regions: ['NZ', 'CK'],
        speakers: 0.2,
    },
    mk: {
        name: 'македонски јазик',
        en: 'Macedonian',
        scripts: ['Cyrl'],
        regions: ['MK', 'AL', 'BG', 'GR', 'RS', 'TR'],
        speakers: 2,
    },
    ml: {
        name: 'മലയാളം',
        en: 'Malayalam',
        scripts: ['Mlym', 'Latn'],
        regions: ['IN', 'AE', 'SA', 'BH', 'OM'],
        speakers: 38,
    },
    mn: {
        name: 'Монгол хэл/ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ',
        en: 'Mongolian',
        scripts: ['Cyrl', 'Mong'],
        regions: ['MN', 'CN', 'RU'],
        speakers: 5,
    },
    mr: {
        name: 'मराठी',
        en: 'Marathi',
        scripts: ['Deva'],
        regions: ['IN'],
        speakers: 99,
    },
    ms: {
        name: 'Bahasa Malaysia',
        en: 'Malay',
        scripts: ['Latn', 'Arab'],
        regions: ['MY', 'BN', 'SG', 'ID', 'TH', 'PH'],
        speakers: 80,
    },
    mt: {
        name: 'Malti',
        en: 'Maltese',
        scripts: ['Latn'],
        regions: ['MT'],
        speakers: 0.5,
    },
    my: {
        name: 'Myanmar',
        en: 'Burmese',
        scripts: ['Mymr'],
        regions: ['MM'],
        speakers: 43,
    },
    nd: {
        name: 'siNdebele',
        en: 'North Ndebele',
        scripts: ['Latn'],
        regions: ['ZW', 'BW'],
        speakers: 1.6,
    },
    nb: {
        name: 'norsk bokmål',
        en: 'Norwegian Bokmål',
        scripts: ['Latn'],
        regions: ['NO'],
        speakers: 5,
    },
    na: {
        name: 'Dorerin Naoero',
        en: 'Nauru',
        scripts: ['Latn'],
        regions: ['NR'],
        speakers: 0.01,
    },
    ne: {
        name: 'नेपाली (नेपाल)',
        en: 'Nepali',
        scripts: ['Deva'],
        regions: ['NP', 'IN', 'BT', 'MM'],
        speakers: 33,
    },
    ng: {
        name: 'Ndonga',
        en: 'Ndonga',
        scripts: ['Latn'],
        regions: ['NA', 'AO'],
        speakers: 0.8,
    },
    nl: {
        name: 'Nederlands',
        en: 'Dutch',
        scripts: ['Latn'],
        regions: ['NL', 'BE', 'SR', 'AW', 'CW', 'SX', 'BQ'],
        speakers: 25,
    },
    nn: {
        name: 'norsk nynorsk',
        en: 'Norwegian Nynorsk',
        scripts: ['Latn'],
        regions: ['NO'],
        speakers: 0.6,
    },
    no: {
        name: 'norsk',
        en: 'Norwegian',
        scripts: ['Latn'],
        regions: ['NO'],
        speakers: 5,
    },
    ny: {
        name: 'chiCheŵa',
        en: 'Nyanja',
        scripts: ['Latn'],
        regions: ['MW', 'ZM', 'MZ', 'ZW'],
        speakers: 14,
    },
    nv: {
        name: 'Diné bizaad',
        en: 'Navajo',
        scripts: ['Latn'],
        regions: ['US'],
        speakers: 0.17,
    },
    nr: {
        name: 'isiNdebele',
        en: 'South Ndebele',
        scripts: ['Latn'],
        regions: ['ZA'],
        speakers: 1.1,
    },
    oc: {
        name: 'Occitan',
        en: 'Occitan',
        scripts: ['Latn'],
        regions: ['FR', 'ES', 'IT', 'MC'],
        speakers: 0.2,
    },
    os: {
        name: 'Ирон ӕвзаг',
        en: 'Ossetian',
        scripts: ['Cyrl'],
        regions: ['GE', 'RU'],
        speakers: 0.6,
    },
    or: {
        name: 'ଓଡ଼ିଆ',
        en: 'Oriya',
        scripts: ['Orya'],
        regions: ['IN'],
        speakers: 38,
    },
    om: {
        name: 'Afaan Oromoo',
        en: 'Oromo',
        scripts: ['Latn'],
        regions: ['ET', 'KE', 'SO', 'EG'],
        speakers: 37,
    },
    oj: {
        name: 'ᐊᓂᔑᓈᐯᒧᐎᓐ',
        en: 'Ojibwa',
        scripts: ['Latn', 'Cans'],
        regions: ['CA', 'US'],
        speakers: 0.03,
    },
    pa: {
        name: 'ਪੰਜਾਬੀ',
        en: 'Punjabi',
        scripts: ['Guru', 'Arab'],
        regions: ['IN', 'PK', 'GB', 'CA', 'US'],
        speakers: 113,
    },
    pi: {
        name: 'पालि',
        en: 'Pali',
        scripts: ['Deva'],
        regions: ['IN', 'LK', 'MM', 'TH', 'KH', 'LA', 'VN'],
        speakers: 0,
    },
    pl: {
        name: 'polski',
        en: 'Polish',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['PL', 'LT', 'BY', 'UA', 'CZ', 'DE', 'GB', 'US'],
        speakers: 41,
    },
    ps: {
        name: 'پښتو',
        en: 'Pashto',
        scripts: ['Arab'],
        regions: ['AF', 'PK', 'IR'],
        speakers: 60,
    },
    pt: {
        name: 'Português',
        en: 'Portuguese',
        quote: '»',
        secondary: '"',
        scripts: ['Latn'],
        regions: ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'TL', 'ST'],
        speakers: 264,
    },
    qu: {
        name: 'runasimi',
        en: 'Quechua',
        scripts: ['Latn'],
        regions: ['PE', 'BO', 'EC', 'AR', 'CL', 'CO'],
        speakers: 8,
    },
    rm: {
        name: 'Rumantsch',
        en: 'Romansh',
        scripts: ['Latn'],
        regions: ['CH'],
        speakers: 0.06,
    },
    rn: {
        name: 'Ikirundi',
        en: 'Rundi',
        scripts: ['Latn'],
        regions: ['BI', 'RW', 'TZ', 'UG'],
        speakers: 9,
    },
    ro: {
        name: 'română',
        en: 'Romanian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['RO', 'MD', 'RS', 'UA', 'HU', 'BG'],
        speakers: 24,
    },
    ru: {
        name: 'русский',
        en: 'Russian',
        quote: '«',
        scripts: ['Cyrl'],
        regions: ['RU', 'BY', 'KZ', 'KG', 'MD', 'UA', 'UZ', 'TJ'],
        speakers: 255,
    },
    rw: {
        name: 'Kinyarwanda',
        en: 'Kinyarwanda',
        scripts: ['Latn'],
        regions: ['RW', 'BI', 'UG', 'CD', 'TZ'],
        speakers: 12,
    },
    sa: {
        name: 'संस्कृत',
        en: 'Sanskrit',
        scripts: ['Deva', 'Gran', 'Sidd', 'Brah', 'Shrd'],
        regions: ['IN', 'NP'],
        speakers: 0.025,
    },
    sg: {
        name: 'yângâ tî sängö',
        en: 'Sango',
        scripts: ['Latn'],
        regions: ['CF', 'CD', 'TD'],
        speakers: 5,
    },
    se: {
        name: 'davvisámegiella',
        en: 'Northern Sami',
        scripts: ['Latn'],
        regions: ['NO', 'SE', 'FI', 'RU'],
        speakers: 0.025,
    },
    sd: {
        name: 'सिन्धी',
        en: 'Sindhi',
        scripts: ['Arab', 'Deva', 'Sind'],
        regions: ['PK', 'IN', 'AE', 'GB'],
        speakers: 25,
    },
    sc: {
        name: 'sardu',
        en: 'Sardinian',
        scripts: ['Latn'],
        regions: ['IT'],
        speakers: 1,
    },
    si: {
        name: 'සිංහල',
        en: 'Sinhala',
        scripts: ['Sinh'],
        regions: ['LK', 'AE', 'SG'],
        speakers: 17,
    },
    sk: {
        name: 'slovenčina',
        en: 'Slovak',
        scripts: ['Latn'],
        regions: ['SK', 'CZ', 'HU', 'RS', 'PL', 'UA'],
        speakers: 5,
    },
    sl: {
        name: 'slovenski',
        en: 'Slovenian',
        quote: '„',
        scripts: ['Latn'],
        regions: ['SI', 'IT', 'AT', 'HU', 'HR'],
        speakers: 2.5,
    },
    so: {
        name: 'Soomaaliga',
        en: 'Somali',
        scripts: ['Latn', 'Osma', 'Arab'],
        regions: ['SO', 'DJ', 'ET', 'KE', 'YE'],
        speakers: 22,
    },
    sn: {
        name: 'chiShona',
        en: 'Shona',
        scripts: ['Latn'],
        regions: ['ZW', 'ZM', 'MZ', 'BW'],
        speakers: 11,
    },
    sm: {
        name: "gagana fa'a Samoa",
        en: 'Samoan',
        scripts: ['Latn'],
        regions: ['WS', 'AS', 'NZ', 'AU', 'US'],
        speakers: 0.5,
    },
    sq: {
        name: 'shqipe',
        en: 'Albanian',
        scripts: ['Latn'],
        regions: ['AL', 'XK', 'MK', 'ME', 'GR', 'IT', 'TR', 'RS'],
        speakers: 8,
    },
    sr: {
        name: 'srpski/српски',
        en: 'Serbian',
        scripts: ['Cyrl', 'Latn'],
        regions: ['RS', 'BA', 'ME', 'XK', 'HR', 'MK', 'SI'],
        speakers: 8,
    },
    su: {
        name: 'basa Sunda',
        en: 'Sundanese',
        scripts: ['Latn', 'Sund'],
        regions: ['ID'],
        speakers: 32,
    },
    st: {
        name: 'Sesotho',
        en: 'Southern Sotho',
        scripts: ['Latn'],
        regions: ['LS', 'ZA', 'ZW'],
        speakers: 14,
    },
    ss: {
        name: 'siSwati',
        en: 'Swati',
        scripts: ['Latn'],
        regions: ['SZ', 'ZA', 'MZ'],
        speakers: 2.5,
    },
    sv: {
        name: 'svenska',
        en: 'Swedish',
        quote: '”',
        scripts: ['Latn'],
        regions: ['SE', 'FI', 'NO', 'AX'],
        speakers: 13,
    },
    sw: {
        name: 'Kiswahili',
        en: 'Swahili',
        scripts: ['Latn'],
        regions: [
            'TZ',
            'KE',
            'UG',
            'CD',
            'RW',
            'BI',
            'MZ',
            'KM',
            'YT',
            'OM',
            'SO',
        ],
        speakers: 200,
    },
    syc: {
        name: 'ܣܘܪܝܝܐ',
        en: 'Syriac',
        scripts: ['Syrc'],
        regions: ['IQ', 'SY', 'TR', 'LB', 'IR'],
        speakers: 0,
    },
    ta: {
        name: 'தமிழ்',
        en: 'Tamil',
        scripts: ['Taml'],
        regions: ['IN', 'LK', 'SG', 'MY', 'MU', 'FJ', 'RE'],
        speakers: 86,
    },
    te: {
        name: 'తెలుగు',
        en: 'Telugu',
        scripts: ['Telu'],
        regions: ['IN', 'US', 'MY', 'AE'],
        speakers: 96,
    },
    tg: {
        name: 'Тоҷикӣ',
        en: 'Tajik',
        scripts: ['Cyrl', 'Arab'],
        regions: ['TJ', 'UZ', 'AF', 'KG', 'RU'],
        speakers: 8,
    },
    th: {
        name: 'ไทย',
        en: 'Thai',
        scripts: ['Thai'],
        regions: ['TH'],
        speakers: 60,
    },
    tk: {
        name: 'Türkmen dili',
        en: 'Turkmen',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: ['TM', 'AF', 'IR', 'TR', 'TJ', 'UZ', 'RU'],
        speakers: 7,
    },
    ti: {
        name: 'ትግርኛ',
        en: 'Tigrinya',
        scripts: ['Ethi'],
        regions: ['ER', 'ET'],
        speakers: 9,
    },
    tl: {
        name: 'ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔',
        en: 'Tagalog',
        scripts: ['Latn', 'Tglg'],
        regions: ['PH', 'US'],
        speakers: 87,
    },
    tn: {
        name: 'Setswana',
        en: 'Tswana',
        scripts: ['Latn'],
        regions: ['BW', 'ZA', 'NA', 'ZW'],
        speakers: 14,
    },
    to: {
        name: 'lea fakatonga',
        en: 'Tongan',
        scripts: ['Latn'],
        regions: ['TO', 'NZ', 'AU', 'US'],
        speakers: 0.19,
    },
    tr: {
        name: 'Türkçe',
        en: 'Turkish',
        scripts: ['Latn'],
        regions: [
            'TR',
            'CY',
            'DE',
            'BG',
            'MK',
            'NL',
            'AT',
            'GR',
            'IQ',
            'RO',
            'RS',
            'XK',
            'AZ',
            'UZ',
            'SY',
        ],
        speakers: 90,
    },
    ts: {
        name: 'Xitsonga',
        en: 'Tsonga',
        scripts: ['Latn'],
        regions: ['ZA', 'MZ', 'ZW', 'SZ'],
        speakers: 7,
    },
    tt: {
        name: 'Татарча',
        en: 'Tatar',
        scripts: ['Cyrl', 'Latn'],
        regions: ['RU', 'UZ', 'KZ', 'TR', 'CN'],
        speakers: 4.3,
    },
    ty: {
        name: 'Reo Tahiti',
        en: 'Tahitian',
        scripts: ['Latn'],
        regions: ['PF'],
        speakers: 0.07,
    },
    tw: {
        name: 'Twi',
        en: 'Twi',
        scripts: ['Latn'],
        regions: ['GH'],
        speakers: 9,
    },
    ug: {
        name: 'ئۇيغۇرچە',
        en: 'Uyghur',
        scripts: ['Arab'],
        regions: ['CN', 'KZ', 'UZ', 'KG', 'TR'],
        speakers: 10,
    },
    uk: {
        name: 'українська',
        en: 'Ukrainian',
        quote: '«',
        secondary: '„',
        scripts: ['Cyrl'],
        regions: ['UA', 'PL', 'CA', 'US', 'BY', 'RU', 'KZ', 'MD', 'RO', 'SK'],
        speakers: 33,
    },
    ur: {
        name: 'اُردو',
        en: 'Urdu',
        scripts: ['Arab'],
        regions: ['PK', 'IN', 'AE', 'SA', 'GB', 'US', 'BD'],
        speakers: 240,
    },
    uz: {
        name: "U'zbek/Ўзбек",
        en: 'Uzbek',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: ['UZ', 'AF', 'KZ', 'KG', 'TJ', 'TM', 'RU', 'CN', 'TR'],
        speakers: 35,
    },
    ve: {
        name: 'Tshivenḓa',
        en: 'Venda',
        scripts: ['Latn'],
        regions: ['ZA', 'ZW'],
        speakers: 1.3,
    },
    vi: {
        name: 'Tiếng Việt/㗂越',
        en: 'Vietnamese',
        scripts: ['Latn'],
        regions: ['VN', 'US', 'KH', 'LA'],
        speakers: 86,
    },
    wa: {
        name: 'walon',
        en: 'Walloon',
        scripts: ['Latn'],
        regions: ['BE'],
        speakers: 0.6,
    },
    vo: {
        name: 'Volapük',
        en: 'Volapük',
        scripts: ['Latn'],
        regions: [],
        speakers: 0.0002,
    },
    wo: {
        name: 'Wolof',
        en: 'Wolof',
        scripts: ['Latn', 'Arab', 'Gara'],
        regions: ['SN', 'GM', 'MR'],
        speakers: 12,
    },
    xh: {
        name: 'isiXhosa',
        en: 'Xhosa',
        scripts: ['Latn'],
        regions: ['ZA', 'ZW', 'LS'],
        speakers: 19,
    },
    yi: {
        name: 'ייִדיש',
        en: 'Yiddish',
        scripts: ['Hebr'],
        regions: ['IL', 'US', 'CA', 'GB', 'BE', 'FR', 'AR', 'UA', 'BY', 'RU'],
        speakers: 1.5,
    },
    yo: {
        name: 'Yoruba',
        en: 'Yoruba',
        scripts: ['Latn'],
        regions: ['NG', 'BJ', 'TG', 'GH', 'CI'],
        speakers: 46,
    },
    za: {
        name: 'Saɯ cueŋƅ',
        en: 'Zhuang',
        scripts: ['Latn'],
        regions: ['CN'],
        speakers: 16,
    },
    zh: {
        name: '中文',
        en: 'Chinese',
        quote: '「',
        secondary: '『',
        scripts: ['Hans', 'Hant', 'Hani', 'Bopo'],
        regions: ['CN', 'TW', 'HK', 'SG', 'MO', 'MY'],
        speakers: 1140,
    },
    zu: {
        name: 'isiZulu',
        en: 'Zulu',
        scripts: ['Latn'],
        regions: ['ZA', 'LS', 'MW', 'MZ'],
        speakers: 28,
    },
    ace: {
        name: 'Bahsa Acèh',
        en: 'Acehnese',
        scripts: ['Latn', 'Arab'],
        regions: ['ID'],
        speakers: 3.5,
    },
    awa: {
        name: 'अवधी',
        en: 'Awadhi',
        scripts: ['Deva', 'Kthi'],
        regions: ['IN', 'NP'],
        speakers: 39,
    },
    ban: {
        name: 'ᬩᬲᬩᬮᬶ',
        en: 'Balinese',
        scripts: ['Latn', 'Bali'],
        regions: ['ID'],
        speakers: 3.3,
    },
    bax: {
        name: 'ꚠꚡꚢ',
        en: 'Bamum',
        scripts: ['Latn', 'Bamu'],
        regions: ['CM'],
        speakers: 0.5,
    },
    bbc: {
        name: 'Hata Batak Toba',
        en: 'Batak Toba',
        scripts: ['Latn', 'Batk'],
        regions: ['ID'],
        speakers: 2,
    },
    bik: {
        name: 'Bikol',
        en: 'Bikol',
        scripts: ['Latn'],
        regions: ['PH'],
        speakers: 4,
    },
    blt: {
        name: 'Tai Dam',
        en: 'Tai Dam',
        scripts: ['Tavt', 'Latn'],
        regions: ['VN', 'TH', 'LA'],
        speakers: 0.8,
    },
    brx: {
        name: 'बर‌‌‌‌',
        en: 'Bodo',
        scripts: ['Deva', 'Latn'],
        regions: ['IN'],
        speakers: 1.5,
    },
    bsq: {
        name: 'Bassa Vah',
        en: 'Bassa',
        scripts: ['Latn', 'Bass'],
        regions: ['LR'],
        speakers: 0.4,
    },
    bug: {
        name: 'ᨒᨚᨈᨑ',
        en: 'Buginese',
        scripts: ['Latn', 'Bugi'],
        regions: ['ID'],
        speakers: 5,
    },
    ccp: {
        name: '𑄌𑄋𑄴𑄟𑄳𑄦',
        en: 'Chakma',
        scripts: ['Cakm', 'Beng'],
        regions: ['BD', 'IN'],
        speakers: 0.6,
    },
    ceb: {
        name: 'Sinugbuanong Binisayâ',
        en: 'Cebuano',
        scripts: ['Latn'],
        regions: ['PH'],
        speakers: 22,
    },
    chr: {
        name: 'ᏣᎳᎩ',
        en: 'Cherokee',
        scripts: ['Cher', 'Latn'],
        regions: ['US'],
        speakers: 0.002,
    },
    cjm: {
        name: 'ꨌꩌ',
        en: 'Cham',
        scripts: ['Cham', 'Latn'],
        regions: ['VN', 'KH'],
        speakers: 0.3,
    },
    ckb: {
        name: 'سۆرانی',
        en: 'Sorani Kurdish',
        scripts: ['Arab', 'Latn'],
        regions: ['IQ', 'IR'],
        speakers: 9,
    },
    cop: {
        name: 'ⲘⲉⲧⲢⲉⲙ̀ⲛⲭⲏⲙⲓ',
        en: 'Coptic',
        scripts: ['Copt'],
        regions: ['EG'],
        speakers: 0,
    },
    doi: {
        name: 'डोगरी',
        en: 'Dogri',
        scripts: ['Deva', 'Dogr', 'Takr'],
        regions: ['IN'],
        speakers: 5,
    },
    emk: {
        name: 'ߒߞߏ',
        en: 'Eastern Maninkakan',
        scripts: ['Latn', 'Nkoo', 'Arab'],
        regions: ['GN', 'ML', 'CI', 'LR', 'SL'],
        speakers: 3,
    },
    fon: {
        name: 'Fɔngbè',
        en: 'Fon',
        scripts: ['Latn'],
        regions: ['BJ', 'TG'],
        speakers: 4.2,
    },
    hil: {
        name: 'Ilonggo',
        en: 'Hiligaynon',
        scripts: ['Latn'],
        regions: ['PH'],
        speakers: 9,
    },
    hmn: {
        name: 'Hmoob',
        en: 'Hmong',
        scripts: ['Latn', 'Hmng', 'Hmnp', 'Plrd'],
        regions: ['LA', 'VN', 'CN', 'US', 'TH'],
        speakers: 4,
    },
    hnn: {
        name: 'ᜱᜨᜳᜨᜳᜢ',
        en: 'Hanunoo',
        scripts: ['Latn', 'Hano'],
        regions: ['PH'],
        speakers: 0.013,
    },
    hoc: {
        name: 'Ho',
        en: 'Ho',
        scripts: ['Wara', 'Deva', 'Olck', 'Latn'],
        regions: ['IN'],
        speakers: 1.4,
    },
    ilo: {
        name: 'Ilokano',
        en: 'Ilocano',
        scripts: ['Latn'],
        regions: ['PH'],
        speakers: 9,
    },
    khb: {
        name: 'ᦟᦲᧅᦷᦎ',
        en: 'Lü',
        scripts: ['Talu', 'Latn'],
        regions: ['CN', 'LA', 'MM', 'TH', 'VN'],
        speakers: 0.6,
    },
    kha: {
        name: 'Ka Ktien Khasi',
        en: 'Khasi',
        scripts: ['Latn'],
        regions: ['IN', 'BD'],
        speakers: 1.5,
    },
    kru: {
        name: 'कुड़ुख़',
        en: 'Kurukh',
        scripts: ['Latn', 'Tols', 'Deva'],
        regions: ['IN', 'BD', 'NP'],
        speakers: 2.3,
    },
    lep: {
        name: 'ᰛᰩᰵ',
        en: 'Lepcha',
        scripts: ['Lepc', 'Tibt'],
        regions: ['IN', 'BT', 'NP'],
        speakers: 0.06,
    },
    lif: {
        name: 'ᤛᤡᤖᤡᤈᤨᤅᤠ',
        en: 'Limbu',
        scripts: ['Limb', 'Deva'],
        regions: ['NP', 'IN'],
        speakers: 0.4,
    },
    lis: {
        name: 'ꓡꓲ-ꓢꓴ',
        en: 'Lisu',
        scripts: ['Lisu', 'Latn'],
        regions: ['CN', 'MM', 'TH', 'IN'],
        speakers: 0.9,
    },
    luo: {
        name: 'Dholuo',
        en: 'Luo',
        scripts: ['Latn'],
        regions: ['KE', 'TZ', 'UG'],
        speakers: 6,
    },
    mad: {
        name: 'Madhura',
        en: 'Madurese',
        scripts: ['Latn'],
        regions: ['ID'],
        speakers: 7,
    },
    mag: {
        name: 'मगही',
        en: 'Magahi',
        scripts: ['Deva', 'Kthi'],
        regions: ['IN'],
        speakers: 13,
    },
    mai: {
        name: 'मैथिली',
        en: 'Maithili',
        scripts: ['Deva', 'Tirh'],
        regions: ['IN', 'NP'],
        speakers: 33,
    },
    mak: {
        name: 'Basa Mangkasaraʼ',
        en: 'Makasar',
        scripts: ['Latn', 'Maka', 'Bugi'],
        regions: ['ID'],
        speakers: 2,
    },
    men: {
        name: 'Mɛnde Yia',
        en: 'Mende',
        scripts: ['Latn', 'Mend'],
        regions: ['SL', 'LR'],
        speakers: 1.5,
    },
    min: {
        name: 'Baso Minangkabau',
        en: 'Minangkabau',
        scripts: ['Latn', 'Arab'],
        regions: ['ID'],
        speakers: 6.5,
    },
    mni: {
        name: 'ꯃꯤꯇꯩꯂꯣꯟ',
        en: 'Manipuri',
        scripts: ['Mtei', 'Beng'],
        regions: ['IN', 'BD', 'MM'],
        speakers: 1.8,
    },
    mos: {
        name: 'Mòoré',
        en: 'Mossi',
        scripts: ['Latn'],
        regions: ['BF', 'CI', 'GH', 'ML', 'TG'],
        speakers: 8,
    },
    mro: {
        name: '𖩃𖩂𖩐',
        en: 'Mro',
        scripts: ['Mroo', 'Latn'],
        regions: ['BD', 'MM', 'IN'],
        speakers: 0.08,
    },
    new: {
        name: 'नेपाल भाषा',
        en: 'Newari',
        scripts: ['Deva', 'Newa'],
        regions: ['NP'],
        speakers: 0.8,
    },
    nnp: {
        name: 'Wancho',
        en: 'Wancho',
        scripts: ['Wcho', 'Latn'],
        regions: ['IN'],
        speakers: 0.06,
    },
    nod: {
        name: 'ᨣᩴᩤᨾᩮᩬᩥᨦ',
        en: 'Northern Thai',
        scripts: ['Thai', 'Lana'],
        regions: ['TH', 'LA', 'MM'],
        speakers: 6,
    },
    nst: {
        name: 'Tangsa',
        en: 'Tangsa',
        scripts: ['Tnsa', 'Latn'],
        regions: ['IN', 'MM'],
        speakers: 0.1,
    },
    osa: {
        name: '𐓏𐓘𐓻𐓘𐓻𐓟',
        en: 'Osage',
        scripts: ['Osge', 'Latn'],
        regions: ['US'],
        speakers: 0.001,
    },
    raj: {
        name: 'राजस्थानी',
        en: 'Rajasthani',
        scripts: ['Deva'],
        regions: ['IN', 'PK'],
        speakers: 50,
    },
    rej: {
        name: 'Baso Jang',
        en: 'Rejang',
        scripts: ['Latn', 'Rjng'],
        regions: ['ID'],
        speakers: 0.2,
    },
    rhg: {
        name: '𐴌𐴗𐴥𐴝',
        en: 'Rohingya',
        scripts: ['Rohg', 'Arab', 'Latn'],
        regions: ['MM', 'BD'],
        speakers: 2,
    },
    rom: {
        name: 'Romani ćhib',
        en: 'Romani',
        scripts: ['Latn', 'Cyrl'],
        regions: ['RO', 'BG', 'RS', 'HU', 'SK', 'ES', 'TR', 'MK'],
        speakers: 4.6,
    },
    sah: {
        name: 'Саха тыла',
        en: 'Yakut',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 0.45,
    },
    sat: {
        name: 'ᱥᱟᱱᱛᱟᱲᱤ',
        en: 'Santali',
        scripts: ['Olck', 'Latn', 'Deva', 'Beng', 'Orya'],
        regions: ['IN', 'BD', 'NP', 'BT'],
        speakers: 7,
    },
    saz: {
        name: 'ꢱꣃꢬꢵꢰ꣄ꢜ꣄ꢬꢵ',
        en: 'Saurashtra',
        scripts: ['Saur', 'Latn', 'Deva'],
        regions: ['IN'],
        speakers: 0.3,
    },
    shn: {
        name: 'လိၵ်ႈတႆး',
        en: 'Shan',
        scripts: ['Mymr', 'Latn'],
        regions: ['MM', 'CN', 'TH'],
        speakers: 3,
    },
    srb: {
        name: '𑃐𑃦𑃝𑃦',
        en: 'Sora',
        scripts: ['Sora', 'Latn', 'Telu', 'Orya'],
        regions: ['IN'],
        speakers: 0.3,
    },
    syl: {
        name: 'ꠍꠤꠟꠐꠤ ꠘꠣꠉꠞꠤ',
        en: 'Sylheti',
        scripts: ['Beng', 'Sylo'],
        regions: ['BD', 'IN', 'GB'],
        speakers: 11,
    },
    tbw: {
        name: 'ᝦᝤᝪᝨᝯ',
        en: 'Tagbanwa',
        scripts: ['Tagb', 'Latn'],
        regions: ['PH'],
        speakers: 0.03,
    },
    tdd: {
        name: 'ᥖᥭᥰᥖᥬᥳ',
        en: 'Tai Nüa',
        scripts: ['Tale', 'Latn'],
        regions: ['CN', 'MM', 'TH'],
        speakers: 0.7,
    },
    tem: {
        name: 'KʌThemnɛ',
        en: 'Temne',
        scripts: ['Latn'],
        regions: ['SL'],
        speakers: 2,
    },
    tzm: {
        name: 'ⵜⴰⵎⴰⵣⵉⵖⵜ',
        en: 'Tamazight',
        scripts: ['Tfng', 'Latn', 'Arab'],
        regions: ['MA', 'DZ', 'LY', 'TN', 'NE', 'ML', 'BF'],
        speakers: 5,
    },
    txo: {
        name: 'Toto',
        en: 'Toto',
        scripts: ['Toto', 'Beng'],
        regions: ['IN', 'BT'],
        speakers: 0.001,
    },
    unr: {
        name: 'Mundari',
        en: 'Mundari',
        scripts: ['Latn', 'Olck', 'Nagm', 'Deva'],
        regions: ['IN', 'BD', 'NP'],
        speakers: 1.6,
    },
    vai: {
        name: 'ꕙꔤ',
        en: 'Vai',
        scripts: ['Vaii', 'Latn'],
        regions: ['LR', 'SL'],
        speakers: 0.1,
    },
    war: {
        name: 'Winaray',
        en: 'Waray',
        scripts: ['Latn'],
        regions: ['PH'],
        speakers: 3.4,
    },
    zza: {
        name: 'Zazaki',
        en: 'Zazaki',
        scripts: ['Latn', 'Arab'],
        regions: ['TR'],
        speakers: 4,
    },
    kbd: {
        name: 'Адыгэбзэ',
        en: 'Kabardian',
        scripts: ['Cyrl'],
        regions: ['RU', 'TR'],
        speakers: 1.7,
    },
    ady: {
        name: 'Адыгабзэ',
        en: 'Adyghe',
        scripts: ['Cyrl'],
        regions: ['RU', 'TR', 'JO', 'IL'],
        speakers: 0.6,
    },
    lez: {
        name: 'Лезги чӀал',
        en: 'Lezgian',
        scripts: ['Cyrl'],
        regions: ['RU', 'AZ'],
        speakers: 0.8,
    },
    crh: {
        name: 'Qırımtatar tili',
        en: 'Crimean Tatar',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: ['UA', 'RU', 'TR', 'UZ', 'RO', 'BG'],
        speakers: 0.6,
    },
    myv: {
        name: 'Эрзянь кель',
        en: 'Erzya',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 0.4,
    },
    mdf: {
        name: 'Мокшень кяль',
        en: 'Moksha',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 0.3,
    },
    mhr: {
        name: 'Олык марий',
        en: 'Eastern Mari',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 0.4,
    },
    udm: {
        name: 'Удмурт кыл',
        en: 'Udmurt',
        scripts: ['Cyrl'],
        regions: ['RU'],
        speakers: 0.3,
    },
    bua: {
        name: 'Буряад хэлэн',
        en: 'Buryat',
        scripts: ['Cyrl', 'Mong'],
        regions: ['RU', 'MN', 'CN'],
        speakers: 0.4,
    },
    tyv: {
        name: 'Тыва дыл',
        en: 'Tuvan',
        scripts: ['Cyrl'],
        regions: ['RU', 'MN', 'CN'],
        speakers: 0.28,
    },
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

/** True if any language's `scripts` array includes the given script. Uses
 *  `some` rather than `includes` so the comparison stays type-safe without
 *  widening: `Script` is a subtype of `string`, so `s === script` is
 *  allowed for any caller-supplied string (including ISO 15924 codes the
 *  curated `Script` union doesn't enumerate). */
function languageUsesScript(scripts: Script[], script: Script | string) {
    return scripts.some((s) => s === script);
}

/** English names of every language that lists the given ISO 15924 script in
 *  its metadata, sorted by approximate speaker count (descending) so the
 *  most widely spoken languages appear first. Languages without speaker
 *  data sort last, alphabetically. Used by the glyph chooser to caption
 *  script-filter options with the languages a script is used to write. */
export function getLanguagesForScript(script: Script | string): string[] {
    return Object.values(Languages)
        .filter((lang) => languageUsesScript(lang.scripts, script))
        .sort((a, b) => {
            const aSpeakers = a.speakers;
            const bSpeakers = b.speakers;
            if (aSpeakers === undefined && bSpeakers === undefined)
                return a.en.localeCompare(b.en);
            if (aSpeakers === undefined) return 1;
            if (bSpeakers === undefined) return -1;
            return bSpeakers - aSpeakers;
        })
        .map((lang) => lang.en);
}

/** Approximate total speakers (in millions) across every language that
 *  uses the given ISO 15924 script. Lets UI rank scripts by reach. Scripts
 *  with no Languages entry return 0 and sort to the bottom. */
export function getScriptSpeakers(script: Script | string): number {
    return Object.values(Languages)
        .filter((lang) => languageUsesScript(lang.scripts, script))
        .reduce((sum, lang) => sum + (lang.speakers ?? 0), 0);
}
