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
    name: string;
    direction: WritingDirection;
    /** Specify writing mode for a language, one of three defined in CSS. Defaults to horizontal-tb. */
    layout: WritingLayout;
};

/** ISO 15924 script names and the languages for which they are relevant */
export const Scripts = {
    Emoj: { name: 'Emoji', direction: 'ltr', layout: 'horizontal-tb' },
    Latn: { name: 'Latin', direction: 'ltr', layout: 'horizontal-tb' },
    Cyrl: { name: 'Cyrillic', direction: 'ltr', layout: 'horizontal-tb' },
    Grek: { name: 'Ελληνικά', direction: 'ltr', layout: 'horizontal-tb' },
    Kore: { name: '한글', direction: 'ltr', layout: 'horizontal-tb' },
    Ethi: { name: 'ግዕዝ', direction: 'ltr', layout: 'horizontal-tb' },
    Hebr: {
        name: 'אָלֶף־בֵּית עִבְרִי',
        direction: 'rtl',
        layout: 'horizontal-tb',
    },
    Arab: { name: 'عربي', direction: 'rtl', layout: 'horizontal-tb' },
    Brah: { name: '𑀥𑀁𑀫𑀮𑀺𑀧𑀺', direction: 'ltr', layout: 'horizontal-tb' },
    Phag: { name: 'ʼPhags-pa', direction: 'ltr', layout: 'horizontal-tb' },
    Mlym: { name: 'മലയാളമെഴുത്ത്', direction: 'ltr', layout: 'horizontal-tb' },
    Deva: { name: 'देवनागरी', direction: 'ltr', layout: 'horizontal-tb' },
    Armn: { name: 'Հայոց գրեր', direction: 'ltr', layout: 'horizontal-tb' },
    Yiii: { name: 'ꆈꌠꁱꂷ', direction: 'ltr', layout: 'horizontal-tb' },
    Hans: { name: '简化字', direction: 'ltr', layout: 'horizontal-tb' },
    Hant: { name: '正體字', direction: 'ltr', layout: 'horizontal-tb' },
    Hang: { name: '한글', direction: 'ltr', layout: 'horizontal-tb' },
    Hira: { name: '平仮名', direction: 'ltr', layout: 'horizontal-tb' },
    Kana: { name: '片仮名', direction: 'ltr', layout: 'horizontal-tb' },
    Mymr: {
        name: 'မွန်မြန်မာအက္ခရာ',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Syrc: { name: 'ܐܠܦ ܒܝܬ ܣܘܪܝܝܐ', direction: 'rtl', layout: 'horizontal-tb' },
    Taml: {
        name: 'தமிழ் அரிச்சுவடி',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Hani: { name: '汉字', direction: 'ltr', layout: 'horizontal-tb' },
    Thai: { name: 'อักษรไทย', direction: 'ltr', layout: 'horizontal-tb' },
    Telu: { name: 'తెలుగు లిపి', direction: 'ltr', layout: 'horizontal-tb' },
    Sinh: {
        name: 'සිංහල අක්ෂර මාලාව',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Mong: {
        name: 'Hudum Mongol bichig',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Laoo: { name: 'ອັກສອນລາວ', direction: 'ltr', layout: 'horizontal-tb' },
    Knda: { name: 'ಕನ್ನಡ ಲಿಪಿ', direction: 'ltr', layout: 'horizontal-tb' },
    Khmr: { name: 'អក្សរខ្មែរ', direction: 'ltr', layout: 'horizontal-tb' },
    Gujr: { name: 'ગુજરાતી લિપિ', direction: 'ltr', layout: 'horizontal-tb' },
    Guru: { name: 'ਗੁਰਮੁਖੀ', direction: 'ltr', layout: 'horizontal-tb' },
    Cans: { name: 'ᑲᓇᑕᒥ ᓂᕆᐊᓕᐊᓂᖅ', direction: 'ltr', layout: 'horizontal-tb' },
    Geor: {
        name: 'ქართული დამწერლობა',
        direction: 'ltr',
        layout: 'horizontal-tb',
    },
    Beng: { name: 'বাংলা লিপি', direction: 'ltr', layout: 'horizontal-tb' },
    Tibt: { name: 'བོད་ཡིག', direction: 'ltr', layout: 'horizontal-tb' },
    Thaa: { name: 'ދިވެހި އަކުރު', direction: 'rtl', layout: 'horizontal-tb' },
    Orya: { name: 'ଓଡ଼ିଆ ଲିପି', direction: 'ltr', layout: 'horizontal-tb' },
} satisfies Record<string, ScriptMetadata>;

export type Script = keyof typeof Scripts;

export const Latin = ['Latn'] as const;
export const Arab = ['Arab'] as const;
export const LatinCyrillicGreek = ['Latn', 'Cyrl', 'Grek'] as const;
