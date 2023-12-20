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
    direction: WritingDirection;
    /** Specify writing mode for a language, one of three defined in CSS. Defaults to horizontal-tb. */
    layout: WritingLayout;
};

/** ISO 15924 script names and the languages for which they are relevant */
export const Scripts = {
    Emoj: { direction: 'ltr', layout: 'horizontal-tb' },
    Latn: { direction: 'ltr', layout: 'horizontal-tb' },
    Cyrl: { direction: 'ltr', layout: 'horizontal-tb' },
    Grek: { direction: 'ltr', layout: 'horizontal-tb' },
    Kore: { direction: 'ltr', layout: 'horizontal-tb' },
    Ethi: { direction: 'ltr', layout: 'horizontal-tb' },
    Hebr: { direction: 'rtl', layout: 'horizontal-tb' },
    Arab: { direction: 'rtl', layout: 'horizontal-tb' },
    Brah: { direction: 'ltr', layout: 'horizontal-tb' },
    Phag: { direction: 'ltr', layout: 'horizontal-tb' },
    Mlym: { direction: 'ltr', layout: 'horizontal-tb' },
    Deva: { direction: 'ltr', layout: 'horizontal-tb' },
    Armn: { direction: 'ltr', layout: 'horizontal-tb' },
    Yiii: { direction: 'ltr', layout: 'horizontal-tb' },
    Cans: { direction: 'ltr', layout: 'horizontal-tb' },
    Jpan: { direction: 'ltr', layout: 'horizontal-tb' },
    Hira: { direction: 'ltr', layout: 'horizontal-tb' },
    Kana: { direction: 'ltr', layout: 'horizontal-tb' },
    Mymr: { direction: 'ltr', layout: 'horizontal-tb' },
    Syrc: { direction: 'rtl', layout: 'horizontal-tb' },
    Taml: { direction: 'ltr', layout: 'horizontal-tb' },
    Hani: { direction: 'ltr', layout: 'horizontal-tb' },
    Thai: { direction: 'ltr', layout: 'horizontal-tb' },
    Telu: { direction: 'ltr', layout: 'horizontal-tb' },
    Sinh: { direction: 'ltr', layout: 'horizontal-tb' },
    Mong: { direction: 'ltr', layout: 'horizontal-tb' },
    Laoo: { direction: 'ltr', layout: 'horizontal-tb' },
    Knda: { direction: 'ltr', layout: 'horizontal-tb' },
    Khmr: { direction: 'ltr', layout: 'horizontal-tb' },
    Geor: { direction: 'ltr', layout: 'horizontal-tb' },
} satisfies Record<string, ScriptMetadata>;

export type Script = keyof typeof Scripts;

export const Latin = ['Latn'] as const;
export const Arab = ['Arab'] as const;
export const LatinCyrillicGreek = ['Latn', 'Cyrl', 'Grek'] as const;
