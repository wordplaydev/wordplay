import { must } from '@util/nullable';

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

    // Two rows rather than the whole matrix: each cell needs only the row
    // above and the cell to its left, and iterating the previous row hands
    // each neighbour over directly rather than indexing for it.
    let previous: number[] = [];
    for (let j = 0; j <= an; ++j) previous.push(j);

    for (let i = 1; i <= bn; ++i) {
        const current: number[] = [];
        let rowMin = i;
        // The cell to the left, and the one diagonally above it.
        let left = i;
        let diagonal = i - 1;
        for (const [j, above] of previous.entries()) {
            if (j === 0) {
                current.push(left);
                continue;
            }
            const cost =
                b.charAt(i - 1) === a.charAt(j - 1)
                    ? diagonal
                    : Math.min(diagonal, left, above) + 1;
            current.push(cost);
            if (cost < rowMin) rowMin = cost;
            diagonal = above;
            left = cost;
        }
        // Every remaining row only grows the minimum, so we can stop early.
        if (max !== undefined && rowMin > max) return max + 1;
        previous = current;
    }
    // The last row's last cell is the distance; the loops above fill both.
    return must(previous[an], 'an edit distance');
}
