import { EMOJI_SYMBOL } from '@parser/Symbols';
import { TextCloseByTextOpen } from '@parser/Tokenizer';
import type Locale from '@locale/Locale';
import type { RegionCode } from '@locale/Regions';
import {
    Scripts,
    type Script,
    type WritingDirection,
    type WritingLayout,
} from '@locale/Scripts';

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

/** Languages Google Cloud Translate does not currently support. Cross-checked
 *  against https://cloud.google.com/translate/docs/languages. Google adds
 *  languages periodically — when a code here gains support, remove its line. */
export const Untranslatable = [
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

/** BCP 47 language tags and other metadata. */
export const Languages = {
    ae: { name: 'avesta', en: 'Avestan', scripts: ['Latn'], regions: ['IR'] },
    ab: {
        name: 'аҧсуа бызшәа',
        en: 'Abkhazian',
        scripts: ['Cyrl'],
        regions: ['GE'],
    },
    aa: {
        name: 'Qafar af',
        en: 'Afar',
        scripts: ['Latn'],
        regions: ['ET', 'DJ', 'ER'],
    },
    '😀': { name: 'Emoji', en: 'Emoji', scripts: ['Emoj'], regions: [] },
    af: {
        name: 'Afrikaans',
        en: 'Afrikaans',
        scripts: ['Latn'],
        regions: ['ZA', 'NA'],
    },
    ak: { name: 'Akan', en: 'Akan', scripts: ['Latn'], regions: ['GH'] },
    am: { name: 'አማርኛ', en: 'Amharic', scripts: ['Ethi'], regions: ['ET'] },
    an: {
        name: 'aragonés',
        en: 'Aragonese',
        scripts: ['Latn'],
        regions: ['ES'],
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
    },
    as: { name: 'অসমীয়া', en: 'Assamese', scripts: ['Beng'], regions: ['IN'] },
    ay: {
        name: 'aymar aru',
        en: 'Aymara',
        scripts: ['Latn'],
        regions: ['BO', 'PE'],
    },
    av: { name: 'авар мацӀ', en: 'Avaric', scripts: ['Cyrl'], regions: ['RU'] },
    az: {
        name: 'Azərbaycan­lı',
        en: 'Azerbaijani',
        scripts: ['Latn'],
        regions: ['AZ', 'IR'],
    },
    ba: { name: 'Башҡорт', en: 'Bashkir', scripts: ['Arab'], regions: ['RU'] },
    be: {
        name: 'беларуская',
        en: 'Belarusian',
        quote: '«',
        secondary: '„',
        scripts: ['Arab'],
        regions: ['BY'],
    },
    bg: {
        name: 'български',
        en: 'Bulgarian',
        quote: '«',
        secondary: "'",
        scripts: ['Cyrl'],
        regions: ['BG'],
    },
    bm: {
        name: 'bamanankan',
        en: 'Bambara',
        scripts: ['Latn'],
        regions: ['ML'],
    },
    bi: { name: 'Bislama', en: 'Bislama', scripts: ['Latn'], regions: ['VU'] },
    bh: {
        name: 'भोजपुरी',
        en: 'Bihari languages',
        scripts: ['Deva'],
        regions: ['IN', 'NP'],
    },
    bn: {
        name: 'বাংলা',
        en: 'Bengali',
        scripts: ['Beng'],
        regions: ['BD', 'IN'],
    },
    bo: {
        name: 'བོད་ཡིག',
        en: 'Tibetan',
        scripts: ['Tibt'],
        regions: ['CN', 'BT', 'NP'],
    },
    br: { name: 'brezhoneg', en: 'Breton', scripts: ['Latn'], regions: ['FR'] },
    bs: {
        name: 'bosanski/босански',
        en: 'Bosnian',
        scripts: ['Latn', 'Cyrl', 'Arab'],
        regions: ['BA'],
    },
    ca: {
        name: 'català',
        en: 'Catalan',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: ['ES', 'AD', 'FR', 'IT'],
    },
    ch: {
        name: 'Chamoru',
        en: 'Chamorro',
        scripts: ['Latn'],
        regions: ['GU', 'MP'],
    },
    ce: {
        name: 'нохчийн мотт',
        en: 'Chechen',
        scripts: ['Cyrl'],
        regions: ['RU'],
    },
    co: { name: 'Corsu', en: 'Corsican', scripts: ['Latn'], regions: ['FR'] },
    cr: { name: 'ᓀᐦᐃᔭᐍᐏᐣ', en: 'Cree', scripts: ['Cans'], regions: ['CA'] },
    cs: { name: 'čeština', en: 'Czech', scripts: ['Latn'], regions: ['CZ'] },
    cv: {
        name: 'чӑваш чӗлхи',
        en: 'Chuvash',
        scripts: ['Cyrl'],
        regions: ['RU'],
    },
    cu: {
        name: 'словѣньскъ ѩзыкъ',
        en: 'Church Slavic',
        scripts: ['Cyrl'],
        regions: ['RU', 'BG', 'MK', 'RS'],
    },
    cy: { name: 'Cymraeg', en: 'Welsh', scripts: ['Latn'], regions: ['GB'] },
    da: {
        name: 'dansk',
        en: 'Danish',
        quote: '»',
        scripts: ['Latn'],
        regions: ['DK', 'GL', 'FO'],
    },
    de: {
        name: 'Deutsch',
        en: 'German',
        quote: '«',
        secondary: '‹',
        scripts: ['Latn'],
        regions: ['DE', 'AT', 'CH', 'LI', 'LU', 'BE'],
    },
    ee: { name: 'Eʋegbe', en: 'Ewe', scripts: ['Latn'], regions: ['GH', 'TG'] },
    dz: { name: 'རྫོང་ཁ', en: 'Dzongkha', scripts: ['Tibt'], regions: ['BT'] },
    dv: { name: 'ދިވެހި', en: 'Divehi', scripts: ['Thaa'], regions: ['MV'] },
    el: {
        name: 'ελληνικά',
        en: 'Greek',
        quote: '«',
        secondary: "'",
        scripts: ['Grek'],
        regions: ['GR', 'CY'],
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
    },
    eo: { name: 'Esperanto', en: 'Esperanto', scripts: ['Latn'], regions: [] },
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
    },
    et: {
        name: 'eesti',
        en: 'Estonian',
        quote: '«',
        secondary: '"',
        scripts: ['Latn'],
        regions: ['EE'],
    },
    eu: {
        name: 'euskara',
        en: 'Basque',
        scripts: ['Latn'],
        regions: ['ES', 'FR'],
    },
    fa: {
        name: 'فارسى',
        en: 'Persian',
        scripts: ['Arab'],
        regions: ['IR', 'AF', 'TJ'],
    },
    ff: {
        name: 'Fulfulde',
        en: 'Fulah',
        scripts: ['Latn'],
        regions: ['SN', 'GN', 'ML', 'NG', 'CM'],
    },
    fi: {
        name: 'suomi',
        en: 'Finnish',
        scripts: ['Latn'],
        regions: ['FI', 'SE'],
    },
    fil: {
        name: 'Filipino',
        en: 'Filipino',
        scripts: ['Latn'],
        regions: ['PH'],
    },
    fj: {
        name: 'vosa Vakaviti',
        en: 'Fijian',
        scripts: ['Latn'],
        regions: ['FJ'],
    },
    fo: { name: 'føroyskt', en: 'Faroese', scripts: ['Latn'], regions: ['FO'] },
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
    },
    fy: {
        name: 'Frysk',
        en: 'Frisian',
        scripts: ['Latn'],
        regions: ['NL', 'DE'],
    },
    ga: { name: 'Gaeilge', en: 'Irish', scripts: ['Latn'], regions: ['IE'] },
    gd: {
        name: 'Gàidhlig',
        en: 'Scottish Gaelic',
        scripts: ['Latn'],
        regions: ['GB'],
    },
    gl: { name: 'galego', en: 'Galician', scripts: ['Latn'], regions: ['ES'] },
    gn: {
        name: "Avañe'ẽ",
        en: 'Guarani',
        scripts: ['Latn'],
        regions: ['PY', 'BO', 'AR'],
    },
    gu: { name: 'ગુજરાતી', en: 'Gujarati', scripts: ['Gujr'], regions: ['IN'] },
    gv: { name: 'Gaelg', en: 'Manx', scripts: ['Latn'], regions: ['IM'] },
    ha: {
        name: 'Hausa',
        en: 'Hausa',
        scripts: ['Latn'],
        regions: ['NG', 'NE', 'GH', 'CM'],
    },
    he: { name: 'עברית', en: 'Hebrew', scripts: ['Hebr'], regions: ['IL'] },
    hi: { name: 'हिंदी', en: 'Hindi', scripts: ['Deva'], regions: ['IN'] },
    ho: {
        name: 'Hiri Motu',
        en: 'Hiri Motu',
        scripts: ['Latn'],
        regions: ['PG'],
    },
    hr: {
        name: 'hrvatski',
        en: 'Croatian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['HR', 'BA'],
    },
    ht: {
        name: 'Kreyòl Ayisyen',
        en: 'Haitian',
        scripts: ['Latn'],
        regions: ['HT'],
    },
    hu: {
        name: 'magyar',
        en: 'Hungarian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['HU', 'RO', 'RS'],
    },
    hy: { name: 'Հայերեն', en: 'Armenian', scripts: ['Armn'], regions: ['AM'] },
    ia: {
        name: 'Interlingua',
        en: 'Interlingua',
        scripts: ['Latn'],
        regions: [],
    },
    hz: {
        name: 'Otjiherero',
        en: 'Herero',
        scripts: ['Latn'],
        regions: ['NA', 'BW'],
    },
    id: {
        name: 'Bahasa Indonesia',
        en: 'Indonesian',
        scripts: ['Latn'],
        regions: ['ID'],
    },
    ie: {
        name: 'Interlingue',
        en: 'Interlingue',
        scripts: ['Latn'],
        regions: [],
    },
    ig: { name: 'Igbo', en: 'Igbo', scripts: ['Latn'], regions: ['NG'] },
    ii: { name: 'ꆈꌠꁱꂷ', en: 'Yi', scripts: ['Yiii'], regions: ['CN'] },
    io: { name: 'Ido', en: 'Ido', scripts: ['Latn'], regions: [] },
    ik: { name: 'Iñupiaq', en: 'Inupiaq', scripts: ['Latn'], regions: ['US'] },
    is: {
        name: 'íslenska',
        en: 'Icelandic',
        scripts: ['Latn'],
        regions: ['IS'],
    },
    it: {
        name: 'italiano',
        en: 'Italian',
        scripts: ['Latn'],
        regions: ['IT', 'CH', 'SM', 'VA'],
    },
    iu: {
        name: 'Inuktitut /ᐃᓄᒃᑎᑐᑦ (ᑲᓇᑕ)',
        en: 'Inuktitut',
        scripts: ['Cans'],
        regions: ['CA'],
    },
    ja: {
        name: '日本語',
        en: 'Japanese',
        quote: '「',
        secondary: '『',
        scripts: ['Hira', 'Kana', 'Kana'],
        regions: ['JP'],
    },
    jv: {
        name: 'basa Jawa',
        en: 'Javanese',
        scripts: ['Latn'],
        regions: ['ID'],
    },
    ka: { name: 'ქართული', en: 'Georgian', scripts: ['Geor'], regions: ['GE'] },
    kj: {
        name: 'Kuanyama',
        en: 'Kuanyama',
        scripts: ['Latn'],
        regions: ['AO', 'NA'],
    },
    ki: { name: 'Gĩkũyũ', en: 'Kikuyu', scripts: ['Latn'], regions: ['KE'] },
    kg: {
        name: 'Kikongo',
        en: 'Kongo',
        scripts: ['Latn'],
        regions: ['CD', 'AO', 'CG'],
    },
    kk: {
        name: 'Қазақша',
        en: 'Kazakh',
        scripts: ['Arab', 'Cyrl'],
        regions: ['KZ', 'CN'],
    },
    kl: {
        name: 'Kalaallisut',
        en: 'Kalaallisut',
        scripts: ['Latn'],
        regions: ['GL'],
    },
    km: { name: 'ខ្មែរ', en: 'Khmer', scripts: ['Khmr'], regions: ['KH'] },
    kn: { name: 'ಕನ್ನಡ', en: 'Kannada', scripts: ['Knda'], regions: ['IN'] },
    ko: {
        name: '한국어',
        en: 'Korean',
        scripts: ['Kore', 'Hang', 'Hani'],
        regions: ['KR', 'KP'],
    },
    gom: { name: 'कोंकणी', en: 'Konkani', scripts: ['Deva'], regions: ['IN'] },
    kw: { name: 'Kernewek', en: 'Cornish', scripts: ['Latn'], regions: ['GB'] },
    kv: { name: 'коми кыв', en: 'Komi', scripts: ['Cyrl'], regions: ['RU'] },
    ku: {
        name: 'Kurdî',
        en: 'Kurdish',
        scripts: ['Latn', 'Arab'],
        regions: ['TR', 'IR', 'IQ', 'SY'],
    },
    ks: {
        name: 'कॉशुर',
        en: 'Kashmiri',
        scripts: ['Arab', 'Deva'],
        regions: ['IN', 'PK'],
    },
    kr: {
        name: 'Kanuri',
        en: 'Kanuri',
        scripts: ['Latn'],
        regions: ['NG', 'NE', 'TD'],
    },
    ky: { name: 'Кыргыз', en: 'Kyrgyz', scripts: ['Cyrl'], regions: ['KG'] },
    la: { name: 'Latina', en: 'Latin', scripts: ['Latn'], regions: ['VA'] },
    lb: {
        name: 'Lëtzebuergesch',
        en: 'Luxembourgish',
        scripts: ['Latn'],
        regions: ['LU'],
    },
    ln: {
        name: 'Lingála',
        en: 'Lingala',
        scripts: ['Latn'],
        regions: ['CD', 'CG', 'AO', 'CF'],
    },
    li: {
        name: 'Limburgs',
        en: 'Limburgan',
        scripts: ['Latn'],
        regions: ['NL', 'BE', 'DE'],
    },
    lg: { name: 'Luganda', en: 'Ganda', scripts: ['Latn'], regions: ['UG'] },
    lo: { name: 'ລາວ', en: 'Lao', scripts: ['Laoo'], regions: ['LA'] },
    lt: {
        name: 'lietuvių',
        en: 'Lithuanian',
        quote: '„',
        scripts: ['Latn'],
        regions: ['LT'],
    },
    lu: {
        name: 'Tshiluba',
        en: 'Luba-Katanga',
        scripts: ['Latn'],
        regions: ['CD'],
    },
    lv: { name: 'latviešu', en: 'Latvian', scripts: ['Latn'], regions: ['LV'] },
    mh: {
        name: 'Kajin M̧ajeļ',
        en: 'Marshallese',
        scripts: ['Latn'],
        regions: ['MH'],
    },
    mg: {
        name: 'fiteny malagasy',
        en: 'Malagasy',
        scripts: ['Latn'],
        regions: ['MG'],
    },
    mi: { name: 'Reo Māori', en: 'Maori', scripts: ['Latn'], regions: ['NZ'] },
    mk: {
        name: 'македонски јазик',
        en: 'Macedonian',
        scripts: ['Cyrl'],
        regions: ['MK'],
    },
    ml: {
        name: 'മലയാളം',
        en: 'Malayalam',
        scripts: ['Mlym', 'Latn'],
        regions: ['IN'],
    },
    mn: {
        name: 'Монгол хэл/ᠮᠤᠨᠭᠭᠤᠯ ᠬᠡᠯᠡ',
        en: 'Mongolian',
        scripts: ['Mong'],
        regions: ['MN', 'CN'],
    },
    mr: { name: 'मराठी', en: 'Marathi', scripts: ['Deva'], regions: ['IN'] },
    ms: {
        name: 'Bahasa Malaysia',
        en: 'Malay',
        scripts: ['Latn'],
        regions: ['MY', 'BN', 'SG'],
    },
    mt: { name: 'Malti', en: 'Maltese', scripts: ['Latn'], regions: ['MT'] },
    my: { name: 'Myanmar', en: 'Burmese', scripts: ['Mymr'], regions: ['MM'] },
    nd: {
        name: 'siNdebele',
        en: 'North Ndebele',
        scripts: ['Latn'],
        regions: ['ZW'],
    },
    nb: {
        name: 'norsk bokmål',
        en: 'Norwegian Bokmål',
        scripts: ['Latn'],
        regions: ['NO'],
    },
    na: {
        name: 'Dorerin Naoero',
        en: 'Nauru',
        scripts: ['Latn'],
        regions: ['NR'],
    },
    ne: {
        name: 'नेपाली (नेपाल)',
        en: 'Nepali',
        scripts: ['Deva'],
        regions: ['NP', 'IN'],
    },
    ng: {
        name: 'Ndonga',
        en: 'Ndonga',
        scripts: ['Latn'],
        regions: ['NA', 'AO'],
    },
    nl: {
        name: 'Nederlands',
        en: 'Dutch',
        scripts: ['Latn'],
        regions: ['NL', 'BE', 'SR', 'AW', 'CW', 'SX'],
    },
    nn: {
        name: 'norsk nynorsk',
        en: 'Norwegian Nynorsk',
        scripts: ['Latn'],
        regions: ['NO'],
    },
    no: { name: 'norsk', en: 'Norwegian', scripts: ['Latn'], regions: ['NO'] },
    ny: {
        name: 'chiCheŵa',
        en: 'Nyanja',
        scripts: ['Latn'],
        regions: ['MW', 'ZM'],
    },
    nv: {
        name: 'Diné bizaad',
        en: 'Navajo',
        scripts: ['Latn'],
        regions: ['US'],
    },
    nr: {
        name: 'isiNdebele',
        en: 'South Ndebele',
        scripts: ['Latn'],
        regions: ['ZA'],
    },
    oc: {
        name: 'Occitan',
        en: 'Occitan',
        scripts: ['Latn'],
        regions: ['FR', 'ES', 'IT', 'MC'],
    },
    os: {
        name: 'Ирон ӕвзаг',
        en: 'Ossetian',
        scripts: ['Cyrl'],
        regions: ['GE', 'RU'],
    },
    or: { name: 'ଓଡ଼ିଆ', en: 'Oriya', scripts: ['Orya'], regions: ['IN'] },
    om: {
        name: 'Afaan Oromoo',
        en: 'Oromo',
        scripts: ['Latn'],
        regions: ['ET', 'KE'],
    },
    oj: {
        name: 'ᐊᓂᔑᓈᐯᒧᐎᓐ',
        en: 'Ojibwa',
        scripts: ['Cans'],
        regions: ['CA', 'US'],
    },
    pa: {
        name: 'ਪੰਜਾਬੀ',
        en: 'Punjabi',
        scripts: ['Guru', 'Arab'],
        regions: ['IN', 'PK'],
    },
    pi: {
        name: 'पालि',
        en: 'Pali',
        scripts: ['Deva'],
        regions: ['IN', 'LK', 'MM', 'TH', 'KH'],
    },
    pl: {
        name: 'polski',
        en: 'Polish',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['PL'],
    },
    ps: {
        name: 'پښتو',
        en: 'Pashto',
        scripts: ['Arab'],
        regions: ['AF', 'PK'],
    },
    pt: {
        name: 'Português',
        en: 'Portuguese',
        quote: '»',
        secondary: '"',
        scripts: ['Latn'],
        regions: ['PT', 'BR', 'AO', 'MZ', 'CV', 'GW', 'TL', 'ST'],
    },
    qu: {
        name: 'runasimi',
        en: 'Quechua',
        scripts: ['Latn'],
        regions: ['PE', 'BO', 'EC', 'AR', 'CL', 'CO'],
    },
    rm: {
        name: 'Rumantsch',
        en: 'Romansh',
        scripts: ['Latn'],
        regions: ['CH'],
    },
    rn: { name: 'Ikirundi', en: 'Rundi', scripts: ['Latn'], regions: ['BI'] },
    ro: {
        name: 'română',
        en: 'Romanian',
        quote: '„',
        secondary: '»',
        scripts: ['Latn'],
        regions: ['RO', 'MD'],
    },
    ru: {
        name: 'русский',
        en: 'Russian',
        quote: '«',
        scripts: ['Cyrl'],
        regions: ['RU', 'BY', 'KZ', 'KG', 'MD', 'UA', 'UZ', 'TJ'],
    },
    rw: {
        name: 'Kinyarwanda',
        en: 'Kinyarwanda',
        scripts: ['Latn'],
        regions: ['RW'],
    },
    sa: { name: 'संस्कृत', en: 'Sanskrit', scripts: ['Deva'], regions: ['IN'] },
    sg: {
        name: 'yângâ tî sängö',
        en: 'Sango',
        scripts: ['Latn'],
        regions: ['CF'],
    },
    se: {
        name: 'davvisámegiella',
        en: 'Northern Sami',
        scripts: ['Latn'],
        regions: ['NO', 'SE', 'FI'],
    },
    sd: {
        name: 'सिन्धी',
        en: 'Sindhi',
        scripts: ['Arab', 'Deva'],
        regions: ['PK', 'IN'],
    },
    sc: { name: 'sardu', en: 'Sardinian', scripts: ['Latn'], regions: ['IT'] },
    si: { name: 'සිංහල', en: 'Sinhala', scripts: ['Sinh'], regions: ['LK'] },
    sk: {
        name: 'slovenčina',
        en: 'Slovak',
        scripts: ['Latn'],
        regions: ['SK'],
    },
    sl: {
        name: 'slovenski',
        en: 'Slovenian',
        quote: '„',
        scripts: ['Latn'],
        regions: ['SI'],
    },
    so: {
        name: 'Soomaaliga',
        en: 'Somali',
        scripts: ['Latn'],
        regions: ['SO', 'DJ', 'ET', 'KE'],
    },
    sn: { name: 'chiShona', en: 'Shona', scripts: ['Latn'], regions: ['ZW'] },
    sm: {
        name: "gagana fa'a Samoa",
        en: 'Samoan',
        scripts: ['Latn'],
        regions: ['WS', 'AS', 'NZ'],
    },
    sq: {
        name: 'shqipe',
        en: 'Albanian',
        scripts: ['Latn'],
        regions: ['AL', 'XK', 'MK'],
    },
    sr: {
        name: 'srpski/српски',
        en: 'Serbian',
        scripts: ['Cyrl'],
        regions: ['RS', 'BA', 'ME', 'XK'],
    },
    su: {
        name: 'basa Sunda',
        en: 'Sundanese',
        scripts: ['Latn'],
        regions: ['ID'],
    },
    st: {
        name: 'Sesotho',
        en: 'Southern Sotho',
        scripts: ['Latn'],
        regions: ['LS', 'ZA'],
    },
    ss: {
        name: 'siSwati',
        en: 'Swati',
        scripts: ['Latn'],
        regions: ['SZ', 'ZA'],
    },
    sv: {
        name: 'svenska',
        en: 'Swedish',
        quote: '”',
        scripts: ['Latn'],
        regions: ['SE', 'FI'],
    },
    sw: {
        name: 'Kiswahili',
        en: 'Swahili',
        scripts: ['Latn'],
        regions: ['TZ', 'KE', 'UG', 'CD'],
    },
    syc: {
        name: 'ܣܘܪܝܝܐ',
        en: 'Syriac',
        scripts: ['Syrc'],
        regions: ['IQ', 'SY', 'TR'],
    },
    ta: {
        name: 'தமிழ்',
        en: 'Tamil',
        scripts: ['Taml'],
        regions: ['IN', 'LK', 'SG'],
    },
    te: { name: 'తెలుగు', en: 'Telugu', scripts: ['Telu'], regions: ['IN'] },
    tg: { name: 'Тоҷикӣ', en: 'Tajik', scripts: ['Cyrl'], regions: ['TJ'] },
    th: { name: 'ไทย', en: 'Thai', scripts: ['Thai'], regions: ['TH'] },
    tk: {
        name: 'Türkmen dili',
        en: 'Turkmen',
        scripts: ['Latn'],
        regions: ['TM', 'AF'],
    },
    ti: {
        name: 'ትግርኛ',
        en: 'Tigrinya',
        scripts: ['Ethi'],
        regions: ['ER', 'ET'],
    },
    tl: {
        name: 'ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔',
        en: 'Tagalog',
        scripts: ['Latn'],
        regions: ['PH'],
    },
    tn: {
        name: 'Setswana',
        en: 'Tswana',
        scripts: ['Latn'],
        regions: ['BW', 'ZA'],
    },
    to: {
        name: 'lea fakatonga',
        en: 'Tongan',
        scripts: ['Latn'],
        regions: ['TO'],
    },
    tr: {
        name: 'Türkçe',
        en: 'Turkish',
        scripts: ['Latn'],
        regions: ['TR', 'CY'],
    },
    ts: {
        name: 'Xitsonga',
        en: 'Tsonga',
        scripts: ['Latn'],
        regions: ['ZA', 'MZ', 'ZW'],
    },
    tt: { name: 'Татарча', en: 'Tatar', scripts: ['Arab'], regions: ['RU'] },
    ty: {
        name: 'Reo Tahiti',
        en: 'Tahitian',
        scripts: ['Latn'],
        regions: ['PF'],
    },
    tw: { name: 'Twi', en: 'Twi', scripts: ['Latn'], regions: ['GH'] },
    ug: { name: 'ئۇيغۇرچە', en: 'Uyghur', scripts: ['Arab'], regions: ['CN'] },
    uk: {
        name: 'українська',
        en: 'Ukrainian',
        quote: '«',
        secondary: '„',
        scripts: ['Cyrl'],
        regions: ['UA'],
    },
    ur: { name: 'اُردو', en: 'Urdu', scripts: ['Arab'], regions: ['PK', 'IN'] },
    uz: {
        name: "U'zbek/Ўзбек",
        en: 'Uzbek',
        scripts: ['Arab'],
        regions: ['UZ', 'AF'],
    },
    ve: { name: 'Tshivenḓa', en: 'Venda', scripts: ['Latn'], regions: ['ZA'] },
    vi: {
        name: 'Tiếng Việt/㗂越',
        en: 'Vietnamese',
        scripts: ['Hani'],
        regions: ['VN'],
    },
    wa: { name: 'walon', en: 'Walloon', scripts: ['Latn'], regions: ['BE'] },
    vo: { name: 'Volapük', en: 'Volapük', scripts: ['Latn'], regions: [] },
    wo: {
        name: 'Wolof',
        en: 'Wolof',
        scripts: ['Latn'],
        regions: ['SN', 'GM', 'MR'],
    },
    xh: { name: 'isiXhosa', en: 'Xhosa', scripts: ['Latn'], regions: ['ZA'] },
    yi: {
        name: 'ייִדיש',
        en: 'Yiddish',
        scripts: ['Hebr'],
        regions: ['IL', 'US'],
    },
    yo: {
        name: 'Yoruba',
        en: 'Yoruba',
        scripts: ['Latn'],
        regions: ['NG', 'BJ', 'TG'],
    },
    za: { name: 'Saɯ cueŋƅ', en: 'Zhuang', scripts: ['Latn'], regions: ['CN'] },
    zh: {
        name: '中文',
        en: 'Chinese',
        quote: '「',
        secondary: '『',
        scripts: ['Hans', 'Hant', 'Hani'],
        regions: ['CN', 'TW', 'HK', 'SG', 'MO'],
    },
    zu: { name: 'isiZulu', en: 'Zulu', scripts: ['Latn'], regions: ['ZA'] },
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
