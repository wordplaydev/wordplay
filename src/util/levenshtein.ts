/**
 * Case-insensitive Levenshtein edit distance between two strings.
 *
 * When `max` is given, the distance is computed with an early exit: as soon as
 * it's certain the distance exceeds `max`, `max + 1` is returned without finishing
 * the matrix. This makes it cheap to ask only "are these within N edits?", which
 * is what fuzzy search needs (see `src/util/search.ts`).
 */
export default function levenshtein(
    a: string,
    b: string,
    max?: number,
): number {
    a = a.toLowerCase();
    b = b.toLowerCase();

    const an = a.length;
    const bn = b.length;
    if (an === 0) return bn;
    if (bn === 0) return an;

    // If lengths differ by more than max, no alignment can be within max edits.
    if (max !== undefined && Math.abs(an - bn) > max) return max + 1;

    const matrix: number[][] = new Array<number[]>(bn + 1);
    for (let i = 0; i <= bn; ++i) {
        const row = (matrix[i] = new Array<number>(an + 1));
        row[0] = i;
    }
    const firstRow = matrix[0];
    for (let j = 1; j <= an; ++j) firstRow[j] = j;
    for (let i = 1; i <= bn; ++i) {
        let rowMin = matrix[i][0];
        for (let j = 1; j <= an; ++j) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] =
                    Math.min(
                        matrix[i - 1][j - 1],
                        matrix[i][j - 1],
                        matrix[i - 1][j],
                    ) + 1;
            }
            if (matrix[i][j] < rowMin) rowMin = matrix[i][j];
        }
        // Every remaining row only grows the minimum, so we can stop early.
        if (max !== undefined && rowMin > max) return max + 1;
    }
    return matrix[bn][an];
}
