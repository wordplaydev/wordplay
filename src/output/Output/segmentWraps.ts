export default function segmentWraps(
    text: string,
    locale?: string,
): string[] {
    const segmenter = new Intl.Segmenter(locale, { granularity: 'word' });
    const out: string[] = [];
    for (const { segment, isWordLike } of segmenter.segment(text)) {
        // Attach non-word-like runs (whitespace, punctuation) to the previous
        // segment so wrapped lines never begin with a leading space, matching
        // the prior convention where 'hello world' → ['hello ', 'world'].
        if (!isWordLike && out.length > 0) out[out.length - 1] += segment;
        else out.push(segment);
    }
    return out;
}
