/**
 * The word index behind the gallery and kit registries' server-side prefilter.
 *
 * Deliberately simple — lowercase, split on anything that isn't a letter or digit —
 * because the client matches against it through the app's own search engine, which does
 * the fuzzy and substring work. `functions/` compiles with rootDir "src" and so cannot
 * import that engine; this only has to agree with it about word boundaries.
 */

/** How many words an index may hold. It is a prefilter, so a truncated one costs recall
 *  on a huge subject rather than correctness, and Firestore caps a document's size. */
export const MAX_WORDS = 400;

export function foldWords(texts: string[]): string[] {
    const words = new Set<string>();
    for (const text of texts)
        for (const word of text
            .normalize('NFC')
            .toLowerCase()
            .split(/[^\p{L}\p{N}]+/u))
            if (word.length > 0) words.add(word);
    return [...words].slice(0, MAX_WORDS);
}

/** Whether a rebuilt index differs from the stored one, so an unchanged one isn't rewritten. */
export function sameWords(a: string[], b: string[]): boolean {
    return a.length === b.length && a.every((word, index) => word === b[index]);
}
