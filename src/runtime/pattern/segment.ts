/**
 * Locale word segmentation for the `▭` (word) and `┊` (word-edge) pattern atoms
 * (LANGUAGE.md). Wraps `Intl.Segmenter(lang, { granularity: 'word' })`, which
 * works in UTF-16 code units, and maps its boundaries back to the matcher's
 * extended-grapheme-cluster indices. Computed once per (graphemes, lang) and
 * cached, since the matcher may probe many positions during a quantifier loop.
 */

export type WordInfo = {
    /** For a word-like segment starting at grapheme index i, its end index. */
    wordStarts: Map<number, number>;
    /** Grapheme indices at a segmenter edge (any segment start, plus the end). */
    boundaries: Set<number>;
};

function segmentWords(graphemes: string[], lang: string): WordInfo {
    // Map each grapheme's UTF-16 start offset to its grapheme index.
    const offsetToIndex = new Map<number, number>();
    let off = 0;
    for (let i = 0; i < graphemes.length; i++) {
        offsetToIndex.set(off, i);
        off += graphemes[i].length;
    }
    offsetToIndex.set(off, graphemes.length);

    const wordStarts = new Map<number, number>();
    const boundaries = new Set<number>([0, graphemes.length]);
    // A multilingual or malformed tag is meaningless for segmentation; fall
    // back to the host default rather than throwing.
    let segmenter: Intl.Segmenter;
    try {
        segmenter = new Intl.Segmenter(lang === '' ? undefined : lang, {
            granularity: 'word',
        });
    } catch {
        segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    }
    for (const seg of segmenter.segment(graphemes.join(''))) {
        const start = offsetToIndex.get(seg.index);
        const end = offsetToIndex.get(seg.index + seg.segment.length);
        if (start === undefined || end === undefined) continue;
        boundaries.add(start);
        boundaries.add(end);
        if (seg.isWordLike === true) wordStarts.set(start, end);
    }
    return { wordStarts, boundaries };
}

const cache = new WeakMap<string[], Map<string, WordInfo>>();

/** Word segmentation for these graphemes in this locale, cached per match run. */
export function getWordInfo(graphemes: string[], lang: string): WordInfo {
    let byLang = cache.get(graphemes);
    if (byLang === undefined) {
        byLang = new Map();
        cache.set(graphemes, byLang);
    }
    let info = byLang.get(lang);
    if (info === undefined) {
        info = segmentWords(graphemes, lang);
        byLang.set(lang, info);
    }
    return info;
}
