import { graphemes } from '@output/getTextTransition';

/** Fisher-Yates shuffle with an injectable random source so tests can seed it. */
function shuffle(list: number[], random: () => number): number[] {
    for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
    }
    return list;
}

/**
 * The per-position slot-machine steps that morph `from` into `to`: every
 * position of the new text cycles random entries from `pool` in parallel,
 * each locking onto its final entry at a different random step. Each step is
 * an array of entries — positions below `to`'s length are in the new text's
 * coordinates ('' before an extra position has cycled in), and the tail
 * positions are the old text's surplus, which cycle and then clear to '' one
 * at a time. The first step is `from` verbatim and the last is exactly `to`.
 * Callers join the entries (plain text) or redress them in a markup's
 * formatting.
 */
export function getRandomEntrySteps(
    from: string[],
    to: string[],
    pool: readonly string[],
    stepCount: number,
    random: () => number = Math.random,
): string[][] {
    // At least start, one cycling step, and end.
    const total = Math.max(3, Math.round(stepCount));
    const last = total - 1;

    // An empty pool locks entries immediately rather than cycling.
    const randomEntry = (fallback: string) =>
        pool.length > 0
            ? pool[Math.floor(random() * pool.length)]
            : fallback;

    const extras = Math.max(0, to.length - from.length);
    const surplus = Math.max(0, from.length - to.length);

    // When the new text is longer, the extra positions appear successively
    // over the first half of the transition; everything else cycles from the
    // first step.
    const appear = to.map((_, position) =>
        position < from.length || extras === 0
            ? 1
            : 1 +
              Math.floor(
                  ((position - from.length) * Math.max(0, last - 1)) /
                      (2 * extras),
              ),
    );

    // Each position locks onto its final entry at a random step between
    // appearing and the end; the final step shows the full end regardless.
    const lock = to.map(
        (_, position) =>
            appear[position] +
            Math.floor(random() * Math.max(1, last - appear[position])),
    );

    // When the new text is shorter, the surplus positions disappear one at a
    // time, evenly spaced across the transition, in random order.
    const disappear: number[] = [];
    shuffle(
        Array.from({ length: surplus }, (_, index) => index),
        random,
    ).forEach((position, order) => {
        disappear[position] =
            1 + Math.floor(((order + 1) * Math.max(0, last - 1)) / (surplus + 1));
    });

    const steps: string[][] = [];
    for (let step = 0; step < total; step++) {
        if (step === 0) {
            // The start, in the new text's coordinates plus the surplus tail.
            steps.push([
                ...to.map((_, position) =>
                    position < from.length ? from[position] : '',
                ),
                ...from.slice(to.length),
            ]);
            continue;
        }
        if (step === last) {
            steps.push([...to, ...Array.from({ length: surplus }, () => '')]);
            continue;
        }
        const entries: string[] = [];
        for (let position = 0; position < to.length; position++) {
            if (step < appear[position]) entries.push('');
            else
                entries.push(
                    step >= lock[position]
                        ? to[position]
                        : randomEntry(to[position]),
                );
        }
        for (let position = 0; position < surplus; position++) {
            entries.push(
                step < disappear[position]
                    ? randomEntry(from[to.length + position])
                    : '',
            );
        }
        steps.push(entries);
    }
    return steps;
}

/**
 * Build the slot-machine steps that morph `start` into `end`: every position
 * of the new text cycles random characters from `pool` in parallel, each
 * locking onto its final character at a different random step. When the new
 * text is longer, the extra positions cycle in successively at the end, one
 * at a time; when shorter, the surplus positions cycle and then disappear one
 * at a time in random order. The first step is `start` and the last is
 * exactly `end`. `stepCount` sets how many steps (and so how many distinct
 * cycling frames) the transition has.
 */
export function getRandomTransition(
    start: string,
    end: string,
    pool: readonly string[],
    stepCount: number,
    random: () => number = Math.random,
): string[] {
    return getRandomEntrySteps(
        graphemes(start),
        graphemes(end),
        pool,
        stepCount,
        random,
    ).map((entries) => entries.join(''));
}
