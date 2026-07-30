/**
 * How many words some text has, segmented in the given BCP-47 locale using
 * `Intl.Segmenter`. Word boundaries are language-specific — Chinese and
 * Japanese have no spaces, so splitting on whitespace would count one "word"
 * per sentence. Mirrors the locale try/catch fallback in
 * src/locale/firstSentence.ts and src/runtime/pattern/segment.ts: a malformed
 * or multilingual tag falls back to the host default rather than throwing.
 */
export default function countWords(text: string, locale: string): number {
    let segmenter: Intl.Segmenter;
    try {
        segmenter = new Intl.Segmenter(locale === '' ? undefined : locale, {
            granularity: 'word',
        });
    } catch {
        segmenter = new Intl.Segmenter(undefined, { granularity: 'word' });
    }
    let count = 0;
    for (const segment of segmenter.segment(text))
        if (segment.isWordLike === true) count++;
    return count;
}
