export type WritingDirection = 'ltr' | 'rtl';
export type WritingLayout = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';
export const HorizontalLayout = '↔↓';
export const VerticalRightLeftLayout = '↕←';
export const VerticalLeftRightLayout = '↕→';
export type WritingLayoutSymbol =
    | typeof HorizontalLayout
    | typeof VerticalLeftRightLayout
    | typeof VerticalRightLeftLayout;

export const CSSByLayout: Record<WritingLayoutSymbol, WritingLayout> = {
    '↔↓': 'horizontal-tb',
    '↕←': 'vertical-rl',
    '↕→': 'vertical-lr',
};

export function layoutToCSS(layout: WritingLayoutSymbol): WritingLayout {
    return CSSByLayout[layout] ?? 'horizontal-tb';
}

export type ScriptMetadata = {
    /** The script's name in the script itself (e.g. "देवनागरी" for Devanagari)
     *  when a confident native form exists. For historical or technical
     *  scripts without a single accepted self-name, this falls back to the
     *  English name. */
    name: string;
    /** The script's English name, matching the long name Unicode publishes
     *  in PropertyValueAliases.txt. */
    en: string;
    direction: WritingDirection;
    /** Specify writing mode for a language, one of three defined in CSS.
     *  Defaults to horizontal-tb — most historical vertical scripts are
     *  rendered horizontally in modern computing environments. */
    layout: WritingLayout;
};

/** ISO 15924 script metadata: native name, English name, and writing
 *  direction/layout. Keys are ISO 15924 four-letter codes (Latn, Cyrl,
 *  Hani, ...). This map is the single source of truth for script display
 *  in Wordplay's UI — every script the glyph picker can surface is listed
 *  here, so no runtime fallback file is needed.
 *
 *  Coverage: all 172 ISO 15924 codes Unicode currently assigns, plus
 *  Wordplay's invented "Emoj" code. The English names match the canonical
 *  long-names in Unicode's PropertyValueAliases.txt; native-script names
 *  are filled in where a clear self-name exists (most modern living
 *  scripts) and fall back to the English name for archaic, liturgical,
 *  technical, or recently-encoded scripts where a single accepted native
 *  form isn't well established.
 *
 *  When Unicode adds a new script in a future version, add an entry here.
 *  After running `npm run codes` to refresh `static/unicode/codes.txt`,
 *  any unknown script appearing in codepoint metadata will display as its
 *  raw ISO code in the picker until added. */
export const Scripts = {
    Emoj: {
        name: 'Emoji',
        en: 'Emoji',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Adlm: {
        name: '𞤀𞤣𞤤𞤢𞤥',
        en: 'Adlam',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Aghb: {
        name: 'Caucasian Albanian',
        en: 'Caucasian Albanian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Ahom: {
        name: 'Ahom',
        en: 'Ahom',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Arab: {
        name: 'عربي',
        en: 'Arabic',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Armi: {
        name: 'Imperial Aramaic',
        en: 'Imperial Aramaic',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Armn: {
        name: 'Հայոց գրեր',
        en: 'Armenian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Avst: {
        name: 'Avestan',
        en: 'Avestan',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Bali: {
        name: 'ᬩᬮᬶ',
        en: 'Balinese',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Bamu: {
        name: 'Bamum',
        en: 'Bamum',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Bass: {
        name: 'Bassa Vah',
        en: 'Bassa Vah',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Batk: {
        name: 'Batak',
        en: 'Batak',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Beng: {
        name: 'বাংলা লিপি',
        en: 'Bengali',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Berf: {
        name: 'Beria Erfe',
        en: 'Beria Erfe',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Bhks: {
        name: 'Bhaiksuki',
        en: 'Bhaiksuki',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Bopo: {
        name: 'ㄅㄆㄇㄈ',
        en: 'Bopomofo',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Brah: {
        name: '𑀥𑀁𑀫𑀮𑀺𑀧𑀺',
        en: 'Brahmi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Brai: {
        name: 'Braille',
        en: 'Braille',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Bugi: {
        name: 'Buginese',
        en: 'Buginese',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Buhd: {
        name: 'Buhid',
        en: 'Buhid',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cakm: {
        name: 'Chakma',
        en: 'Chakma',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cans: {
        name: 'ᑲᓇᑕᒥ ᓂᕆᐊᓕᐊᓂᖅ',
        en: 'Canadian Aboriginal',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cari: {
        name: 'Carian',
        en: 'Carian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cham: {
        name: 'Cham',
        en: 'Cham',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cher: {
        name: 'ᏣᎳᎩ',
        en: 'Cherokee',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Chrs: {
        name: 'Chorasmian',
        en: 'Chorasmian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Copt: {
        name: 'ⲘⲉⲧⲢⲉⲙ̀ⲛⲭⲏⲙⲓ',
        en: 'Coptic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cpmn: {
        name: 'Cypro Minoan',
        en: 'Cypro Minoan',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Cprt: {
        name: 'Cypriot',
        en: 'Cypriot',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Cyrl: {
        name: 'Кириллица',
        en: 'Cyrillic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Deva: {
        name: 'देवनागरी',
        en: 'Devanagari',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Diak: {
        name: 'Dives Akuru',
        en: 'Dives Akuru',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Dogr: {
        name: 'Dogra',
        en: 'Dogra',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Dsrt: {
        name: 'Deseret',
        en: 'Deseret',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Dupl: {
        name: 'Duployan',
        en: 'Duployan',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Egyp: {
        name: '𓊪𓏏𓇯',
        en: 'Egyptian Hieroglyphs',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Elba: {
        name: 'Elbasan',
        en: 'Elbasan',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Elym: {
        name: 'Elymaic',
        en: 'Elymaic',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Ethi: {
        name: 'ግዕዝ',
        en: 'Ethiopic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Gara: {
        name: 'Garay',
        en: 'Garay',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Geor: {
        name: 'ქართული დამწერლობა',
        en: 'Georgian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Glag: {
        name: 'Глаголица',
        en: 'Glagolitic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Gong: {
        name: 'Gunjala Gondi',
        en: 'Gunjala Gondi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Gonm: {
        name: 'Masaram Gondi',
        en: 'Masaram Gondi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Goth: {
        name: 'Gothic',
        en: 'Gothic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Gran: {
        name: 'Grantha',
        en: 'Grantha',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Grek: {
        name: 'Ελληνικά',
        en: 'Greek',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Gujr: {
        name: 'ગુજરાતી લિપિ',
        en: 'Gujarati',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Gukh: {
        name: 'Gurung Khema',
        en: 'Gurung Khema',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Guru: {
        name: 'ਗੁਰਮੁਖੀ',
        en: 'Gurmukhi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hang: {
        name: '한글',
        en: 'Hangul',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hani: {
        name: '汉字',
        en: 'Han',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hano: {
        name: 'Hanunoo',
        en: 'Hanunoo',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hans: {
        name: '简化字',
        en: 'Han (Simplified)',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hant: {
        name: '正體字',
        en: 'Han (Traditional)',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hatr: {
        name: 'Hatran',
        en: 'Hatran',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Hebr: {
        name: 'אָלֶף־בֵּית עִבְרִי',
        en: 'Hebrew',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Hira: {
        name: '平仮名',
        en: 'Hiragana',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hluw: {
        name: 'Anatolian Hieroglyphs',
        en: 'Anatolian Hieroglyphs',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hmng: {
        name: 'Pahawh Hmong',
        en: 'Pahawh Hmong',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hmnp: {
        name: 'Nyiakeng Puachue Hmong',
        en: 'Nyiakeng Puachue Hmong',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hung: {
        name: 'Old Hungarian',
        en: 'Old Hungarian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Ital: {
        name: 'Old Italic',
        en: 'Old Italic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Java: {
        name: 'ꦄꦏ꧀ꦱꦫꦗꦮ',
        en: 'Javanese',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Kali: {
        name: 'Kayah Li',
        en: 'Kayah Li',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Kana: {
        name: '片仮名',
        en: 'Katakana',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Kawi: {
        name: 'Kawi',
        en: 'Kawi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Khar: {
        name: 'Kharoshthi',
        en: 'Kharoshthi',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Khmr: {
        name: 'អក្សរខ្មែរ',
        en: 'Khmer',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Khoj: {
        name: 'Khojki',
        en: 'Khojki',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Kits: {
        name: 'Khitan Small Script',
        en: 'Khitan Small Script',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Knda: {
        name: 'ಕನ್ನಡ ಲಿಪಿ',
        en: 'Kannada',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Kore: {
        name: '한글',
        en: 'Korean',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Krai: {
        name: 'Kirat Rai',
        en: 'Kirat Rai',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Kthi: {
        name: 'Kaithi',
        en: 'Kaithi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Lana: {
        name: 'Tai Tham',
        en: 'Tai Tham',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Laoo: {
        name: 'ອັກສອນລາວ',
        en: 'Lao',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Latn: {
        name: 'Latin',
        en: 'Latin',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Lepc: {
        name: 'Lepcha',
        en: 'Lepcha',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Limb: {
        name: 'Limbu',
        en: 'Limbu',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Lina: {
        name: 'Linear A',
        en: 'Linear A',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Linb: {
        name: 'Linear B',
        en: 'Linear B',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Lisu: {
        name: 'Lisu',
        en: 'Lisu',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Lyci: {
        name: 'Lycian',
        en: 'Lycian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Lydi: {
        name: 'Lydian',
        en: 'Lydian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Mahj: {
        name: 'Mahajani',
        en: 'Mahajani',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Maka: {
        name: 'Makasar',
        en: 'Makasar',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mand: {
        name: 'Mandaic',
        en: 'Mandaic',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Mani: {
        name: 'Manichaean',
        en: 'Manichaean',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Marc: {
        name: 'Marchen',
        en: 'Marchen',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Medf: {
        name: 'Medefaidrin',
        en: 'Medefaidrin',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mend: {
        name: 'Mende Kikakui',
        en: 'Mende Kikakui',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Merc: {
        name: 'Meroitic Cursive',
        en: 'Meroitic Cursive',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Mero: {
        name: 'Meroitic Hieroglyphs',
        en: 'Meroitic Hieroglyphs',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Mlym: {
        name: 'മലയാളമെഴുത്ത്',
        en: 'Malayalam',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Modi: {
        name: 'Modi',
        en: 'Modi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mong: {
        name: 'Hudum Mongol bichig',
        en: 'Mongolian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mroo: {
        name: 'Mro',
        en: 'Mro',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mtei: {
        name: 'ꯃꯤꯇꯩ ꯃꯌꯦꯛ',
        en: 'Meetei Mayek',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mult: {
        name: 'Multani',
        en: 'Multani',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mymr: {
        name: 'မွန်မြန်မာအက္ခရာ',
        en: 'Myanmar',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Nagm: {
        name: 'Nag Mundari',
        en: 'Nag Mundari',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Nand: {
        name: 'Nandinagari',
        en: 'Nandinagari',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Narb: {
        name: 'Old North Arabian',
        en: 'Old North Arabian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Nbat: {
        name: 'Nabataean',
        en: 'Nabataean',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Newa: {
        name: 'Newa',
        en: 'Newa',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Nkoo: {
        name: 'ߒߞߏ',
        en: 'Nko',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Nshu: {
        name: 'Nushu',
        en: 'Nushu',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Ogam: {
        name: 'ᚑᚌᚐᚋ',
        en: 'Ogham',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Olck: {
        name: 'ᱚᱞ ᱪᱤᱠᱤ',
        en: 'Ol Chiki',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Onao: {
        name: 'Ol Onal',
        en: 'Ol Onal',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Orkh: {
        name: 'Old Turkic',
        en: 'Old Turkic',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Orya: {
        name: 'ଓଡ଼ିଆ ଲିପି',
        en: 'Oriya',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Osge: {
        name: 'Osage',
        en: 'Osage',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Osma: {
        name: 'Osmanya',
        en: 'Osmanya',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Ougr: {
        name: 'Old Uyghur',
        en: 'Old Uyghur',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Palm: {
        name: 'Palmyrene',
        en: 'Palmyrene',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Pauc: {
        name: 'Pau Cin Hau',
        en: 'Pau Cin Hau',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Perm: {
        name: 'Old Permic',
        en: 'Old Permic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Phag: {
        name: 'ʼPhags-pa',
        en: 'Phags Pa',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Phli: {
        name: 'Inscriptional Pahlavi',
        en: 'Inscriptional Pahlavi',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Phlp: {
        name: 'Psalter Pahlavi',
        en: 'Psalter Pahlavi',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Phnx: {
        name: 'Phoenician',
        en: 'Phoenician',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Plrd: {
        name: 'Miao',
        en: 'Miao',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Prti: {
        name: 'Inscriptional Parthian',
        en: 'Inscriptional Parthian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Rjng: {
        name: 'Rejang',
        en: 'Rejang',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Rohg: {
        name: 'Hanifi Rohingya',
        en: 'Hanifi Rohingya',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Runr: {
        name: 'ᚱᚢᚾᛁᚲ',
        en: 'Runic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Samr: {
        name: 'Samaritan',
        en: 'Samaritan',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Sarb: {
        name: 'Old South Arabian',
        en: 'Old South Arabian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Saur: {
        name: 'Saurashtra',
        en: 'Saurashtra',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sgnw: {
        name: 'SignWriting',
        en: 'SignWriting',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Shaw: {
        name: 'Shavian',
        en: 'Shavian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Shrd: {
        name: 'Sharada',
        en: 'Sharada',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sidd: {
        name: 'Siddham',
        en: 'Siddham',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sidt: {
        name: 'Sidetic',
        en: 'Sidetic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sind: {
        name: 'Khudawadi',
        en: 'Khudawadi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sinh: {
        name: 'සිංහල අක්ෂර මාලාව',
        en: 'Sinhala',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sogd: {
        name: 'Sogdian',
        en: 'Sogdian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Sogo: {
        name: 'Old Sogdian',
        en: 'Old Sogdian',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Sora: {
        name: 'Sora Sompeng',
        en: 'Sora Sompeng',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Soyo: {
        name: 'Soyombo',
        en: 'Soyombo',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sund: {
        name: 'Sundanese',
        en: 'Sundanese',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sunu: {
        name: 'Sunuwar',
        en: 'Sunuwar',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Sylo: {
        name: 'Syloti Nagri',
        en: 'Syloti Nagri',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Syrc: {
        name: 'ܐܠܦ ܒܝܬ ܣܘܪܝܝܐ',
        en: 'Syriac',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Tagb: {
        name: 'Tagbanwa',
        en: 'Tagbanwa',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Takr: {
        name: 'Takri',
        en: 'Takri',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tale: {
        name: 'Tai Le',
        en: 'Tai Le',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Talu: {
        name: 'New Tai Lue',
        en: 'New Tai Lue',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Taml: {
        name: 'தமிழ் அரிச்சுவடி',
        en: 'Tamil',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tang: {
        name: 'Tangut',
        en: 'Tangut',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tavt: {
        name: 'Tai Viet',
        en: 'Tai Viet',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tayo: {
        name: 'Tai Yo',
        en: 'Tai Yo',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Telu: {
        name: 'తెలుగు లిపి',
        en: 'Telugu',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tfng: {
        name: 'ⵜⵉⴼⵉⵏⴰⵖ',
        en: 'Tifinagh',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tglg: {
        name: 'ᜏᜒᜃᜅ᜔ ᜆᜄᜎᜓᜄ᜔',
        en: 'Tagalog',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Thaa: {
        name: 'ދިވެހި އަކުރު',
        en: 'Thaana',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Thai: {
        name: 'อักษรไทย',
        en: 'Thai',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tibt: {
        name: 'བོད་ཡིག',
        en: 'Tibetan',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tirh: {
        name: 'Tirhuta',
        en: 'Tirhuta',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tnsa: {
        name: 'Tangsa',
        en: 'Tangsa',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Todr: {
        name: 'Todhri',
        en: 'Todhri',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tols: {
        name: 'Tolong Siki',
        en: 'Tolong Siki',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Toto: {
        name: 'Toto',
        en: 'Toto',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Tutg: {
        name: 'Tulu Tigalari',
        en: 'Tulu Tigalari',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Ugar: {
        name: 'Ugaritic',
        en: 'Ugaritic',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Vaii: {
        name: 'ꕙꔤ',
        en: 'Vai',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Vith: {
        name: 'Vithkuqi',
        en: 'Vithkuqi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Wara: {
        name: 'Warang Citi',
        en: 'Warang Citi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Wcho: {
        name: 'Wancho',
        en: 'Wancho',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Xpeo: {
        name: 'Old Persian',
        en: 'Old Persian',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Xsux: {
        name: 'Cuneiform',
        en: 'Cuneiform',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Yezi: {
        name: 'Yezidi',
        en: 'Yezidi',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Yiii: {
        name: 'ꆈꌠꁱꂷ',
        en: 'Yi',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Zanb: {
        name: 'Zanabazar Square',
        en: 'Zanabazar Square',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
} satisfies Record<string, ScriptMetadata>;

export type Script = keyof typeof Scripts;

export const Latin = ['Latn'] as const;
export const Arab = ['Arab'] as const;
export const LatinCyrillicGreek = ['Latn', 'Cyrl', 'Grek'] as const;
