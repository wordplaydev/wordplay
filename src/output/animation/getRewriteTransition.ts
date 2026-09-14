import { graphemes } from '@output/animation/getTextTransition';

/** Fisher-Yates shuffle with an injectable random source so tests can seed it. */
function shuffle<Kind>(list: Kind[], random: () => number): Kind[] {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        const at = list[i];
        const other = list[j];
        // Both indices are in range of a dense list, so this never skips.
        if (at === undefined || other === undefined) continue;
        list[i] = other;
        list[j] = at;
    }
    return list;
}

/**
 * The per-position steps that "type over" `from` with `to`: one position is
 * replaced per step, in random order. Each step is an array of entries, one
 * per position of the longer text — positions below `to`'s length are in the
 * new text's coordinates (space placeholders when the old text is shorter),
 * and the tail positions are the old text's surplus, which clear to '' instead
 * of being replaced. Callers join the entries (plain text) or redress them in
 * a markup's formatting.
 */
export function getRewriteEntrySteps(
    from: string[],
    to: string[],
    random: () => number = Math.random,
): string[][] {
    const length = Math.max(from.length, to.length);

    // One slot per position of the longer text; '' means cleared.
    const slots: string[] = [];
    for (let position = 0; position < length; position++)
        slots.push(from[position] ?? ' ');

    const order = shuffle(
        Array.from({ length }, (_, position) => position),
        random,
    );

    const steps: string[][] = [[...slots]];
    for (const position of order) {
        slots[position] = to[position] ?? '';
        steps.push([...slots]);
    }
    return steps;
}

/**
 * Build the steps that "type over" `start` with `end`: one position is
 * replaced per step, in random order. When the new text is longer, the old
 * text is space-padded so replacements land in placeholders; when shorter,
 * the surplus positions clear instead of being replaced. The first step is
 * the (padded) start and the last is exactly `end`, so the text is never
 * blank unless `end` itself is empty.
 */
export function getRewriteTransition(
    start: string,
    end: string,
    random: () => number = Math.random,
): string[] {
    return getRewriteEntrySteps(graphemes(start), graphemes(end), random).map(
        (entries) => entries.join(''),
    );
}
