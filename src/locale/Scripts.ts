export type WritingDirection = 'ltr' | 'rtl';
export type WritingLayout = 'horizontal-tb' | 'vertical-rl' | 'vertical-lr';

export type ScriptMetadata = {
    direction: WritingDirection;
    /** Specify writing mode for a language, one of three defined in CSS. Defaults to horizontal-tb. */
    layout?: WritingLayout;
};

/** ISO 15924 script names and the languages for which they are relevant */
export const Scripts: Record<string, ScriptMetadata> = {
    Emoj: { direction: 'ltr' },
    Latn: { direction: 'ltr' },
    Cyrl: { direction: 'ltr' },
    Grek: { direction: 'ltr' },
    Kore: { direction: 'ltr', layout: 'vertical-rl' },
    Ethi: { direction: 'ltr' },
    Hebr: { direction: 'rtl' },
    Arab: { direction: 'rtl' },
    Brah: { direction: 'ltr' },
    Phag: { direction: 'ltr' },
    Mlym: { direction: 'ltr' },
    Deva: { direction: 'ltr' },
    Armn: { direction: 'ltr' },
    Yiii: { direction: 'ltr' },
    Cans: { direction: 'ltr' },
    Jpan: { direction: 'ltr' },
    Hira: { direction: 'ltr', layout: 'vertical-rl' },
    Kana: { direction: 'ltr' },
    Mymr: { direction: 'ltr' },
    Syrc: { direction: 'rtl' },
    Taml: { direction: 'ltr' },
    Hani: { direction: 'ltr' },
    Thai: { direction: 'ltr' },
    Telu: { direction: 'ltr' },
    Sinh: { direction: 'ltr' },
    Mong: { direction: 'ltr', layout: 'vertical-lr' },
    Laoo: { direction: 'ltr' },
    Knda: { direction: 'ltr' },
    Khmr: { direction: 'ltr' },
    Geor: { direction: 'ltr' },
} satisfies Record<string, ScriptMetadata>;

export type Script = keyof typeof Scripts;

export const Latin: Script[] = ['Latn'];
export const Arab: Script[] = ['Arab'];
export const LatinCyrillicGreek: Script[] = ['Latn', 'Cyrl', 'Grek'];
