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
    const first = segmenter.segment(text)[Symbol.iterator]().next();
    return (first.done ? text : first.value.segment).trim();
}

/**
 * The first sentence of a Markup's first paragraph, as a new plain-text Markup —
 * the shared source for concept-preview and menu notes ("doc previews").
 */
export function firstSentenceOf(markup: Markup, locale: string): Markup {
    return Markup.words(
        firstSentence(markup.asFirstParagraph().toText(), locale),
    );
}
