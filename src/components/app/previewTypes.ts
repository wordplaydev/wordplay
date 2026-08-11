/**
 * The shape of a project tile's preview, and the placeholder shown when one
 * can't be computed.
 *
 * Separate from extractPreview.ts because computing a preview needs the output
 * layer and the evaluator, while merely *rendering* a tile needs only these
 * two. Keeping them apart is what lets the galleries and projects pages list
 * projects without pulling in the language runtime.
 */
export type ExtractedPreview = {
    text: string;
    foreground: string | null;
    background: string | null;
    face: string | null;
    characterName: string | null;
};

/** Shown when a preview compute throws — a tile that can't be computed should
 *  read as empty, not as perpetually loading. */
export const UncomputablePreview: ExtractedPreview = {
    text: '—',
    foreground: null,
    background: null,
    face: null,
    characterName: null,
};
