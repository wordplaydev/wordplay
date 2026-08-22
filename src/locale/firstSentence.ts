import Markup from '@nodes/Markup';

/**
 * The first sentence of some text, segmented in the given BCP-47 locale using
 * `Intl.Segmenter`. Used to keep preview hints to one line when a concept's docs
 * paragraph runs long. Mirrors the locale try/catch fallback in
 * src/runtime/pattern/segment.ts: a malformed or multilingual tag falls back to
 * the host default rather than throwing.
 */
export default function firstSentence(text: string, locale: string): string {
    let segmenter: Intl.Segmenter;
    try {
        segmenter = new Intl.Segmenter(locale === '' ? undefined : locale, {
            granularity: 'sentence',
        });
    } catch {
        segmenter = new Intl.Segmenter(undefined, { granularity: 'sentence' });
    }
    // ICU ends a sentence at `!`, but `!#` is Wordplay's not-a-number literal
    // (see the Tokenizer rule), so a boundary landing between the two would
    // silently drop the rest of a doc that mentions it. Keep going past those.
    let end = text.length;
    for (const { index, segment } of segmenter.segment(text)) {
        end = index + segment.length;
        if (!(text[end - 1] === '!' && text[end] === '#')) break;
    }
    return text.slice(0, end).trim();
}

/**
 * The first sentence of a Markup's first paragraph — the shared source for
 * concept-preview, menu-note, caret-tooltip, and annotation doc previews.
 *
 * When the first paragraph IS a single sentence (the common case for docs),
 * the paragraph is returned as markup, preserving concept links and
 * formatting — flattening it rendered `@Language` as literal text. Only a
 * multi-sentence paragraph falls back to plain text, since truncating inside
 * a segment can't preserve its structure.
 */
export function firstSentenceOf(markup: Markup, locale: string): Markup {
    const paragraph = markup.asFirstParagraph();
    const full = paragraph.toText();
    const sentence = firstSentence(full, locale);
    return sentence === full.trim() ? paragraph : Markup.words(sentence);
}
