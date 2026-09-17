/**
 * A longest-common-subsequence merge of two arrays by signature.
 *
 * Lifted out of the tutorial's structure sync so that anything wanting to ask
 * "which of these are the ones I already have?" can, without importing the
 * locale verifier's subgraph. Two callers ask it today: the tutorial sync and
 * how-to pairing, over a handful of acts and paragraphs, and the checkpoint
 * diff, over a node's children.
 */
import { must } from '@util/nullable';

/**
 * One step of a merge. The vocabulary is the tutorial sync's, where `source` is
 * en-US and `target` is the translation: `insert` is present in `source` only,
 * `remove` is present in `target` only. A caller whose two arrays are not an
 * authority and a copy should rename at the call site rather than read these
 * as diff words.
 */
export type Alignment<T> =
    | { kind: 'keep'; source: T; target: T }
    | { kind: 'insert'; source: T }
    | { kind: 'remove'; target: T };

/**
 * The plain O(n·m) table. Right for the arrays the tutorial sync passes — at
 * most 8 acts, 12 scenes, and a couple hundred lines. Anything that can be
 * handed a long array should call `alignAffixed` instead, which bounds the
 * table by the differing middle rather than by the whole input.
 */
export function align<T>(
    source: readonly T[],
    target: readonly T[],
    signature: (item: T) => string,
): Alignment<T>[] {
    // Signature and item travel together: `T` may itself be `null` (a tutorial
    // pause), so an item is never asked whether it is present — only its slot is.
    const a = source.map((item) => ({ signature: signature(item), item }));
    const b = target.map((item) => ({ signature: signature(item), item }));

    // One row per source item plus a sentinel, one column per target item plus
    // a sentinel, so every index the walk below reads is inside the table.
    const table: number[][] = Array.from({ length: a.length + 1 }, () =>
        new Array<number>(b.length + 1).fill(0),
    );
    const at = (row: number, column: number) =>
        must(must(table[row], 'a table row')[column], 'a table cell');
    for (let i = a.length - 1; i >= 0; i--) {
        const row = must(table[i], 'a table row');
        const sourceSignature = must(a[i], 'a source entry').signature;
        for (let j = b.length - 1; j >= 0; j--)
            row[j] =
                sourceSignature === must(b[j], 'a target entry').signature
                    ? at(i + 1, j + 1) + 1
                    : Math.max(at(i + 1, j), at(i, j + 1));
    }

    const result: Alignment<T>[] = [];
    let i = 0;
    let j = 0;
    while (i < a.length && j < b.length) {
        const sourceEntry = must(a[i], 'a source entry');
        const targetEntry = must(b[j], 'a target entry');
        if (sourceEntry.signature === targetEntry.signature) {
            result.push({
                kind: 'keep',
                source: sourceEntry.item,
                target: targetEntry.item,
            });
            i++;
            j++;
        } else if (at(i + 1, j) >= at(i, j + 1)) {
            // Present in en-US and not here: insert it.
            result.push({ kind: 'insert', source: sourceEntry.item });
            i++;
        } else {
            // Present here and not in en-US: keep it and say so.
            result.push({ kind: 'remove', target: targetEntry.item });
            j++;
        }
    }
    for (; i < a.length; i++)
        result.push({
            kind: 'insert',
            source: must(a[i], 'a source entry').item,
        });
    for (; j < b.length; j++)
        result.push({
            kind: 'remove',
            target: must(b[j], 'a target entry').item,
        });
    return result;
}

/**
 * `align`, with the matching prefix and suffix taken off first, so the table is
 * O(n·m) in the *differing middle* rather than in the whole input.
 *
 * This is what makes the checkpoint diff affordable. A node's children are
 * almost always a handful — measured over `static/examples/**`, the 99.9th
 * percentile is 14 — but `Lyrics.wp` holds a `ListLiteral` with 1,662, and a
 * full table there is 2.8 million cells for what is usually a one-element edit.
 * Affix-stripping reduces exactly that case to nothing.
 *
 * The result is a valid alignment either way: a common prefix and suffix are
 * always part of *some* longest common subsequence, so emitting them as keeps
 * can only agree with the full table.
 */
export function alignAffixed<T>(
    source: readonly T[],
    target: readonly T[],
    signature: (item: T) => string,
    /**
     * The most table cells the differing middle may take. Past it, the two
     * middles are reported as wholly unlike each other rather than compared —
     * a coarser answer, but a bounded allocation. Unbounded by default, so a
     * caller that knows its arrays are small is unaffected.
     */
    maxCells = Number.POSITIVE_INFINITY,
): Alignment<T>[] {
    const a = source.map(signature);
    const b = target.map(signature);
    const shortest = Math.min(source.length, target.length);

    let prefix = 0;
    while (
        prefix < shortest &&
        must(a[prefix], 'a source signature') ===
            must(b[prefix], 'a target signature')
    )
        prefix++;

    let suffix = 0;
    while (
        suffix < shortest - prefix &&
        must(a[source.length - 1 - suffix], 'a source signature') ===
            must(b[target.length - 1 - suffix], 'a target signature')
    )
        suffix++;

    const middleSource = source.slice(prefix, source.length - suffix);
    const middleTarget = target.slice(prefix, target.length - suffix);

    // Nothing to strip and nothing to refuse: one table, as before.
    if (
        prefix === 0 &&
        suffix === 0 &&
        middleSource.length * middleTarget.length <= maxCells
    )
        return align(source, target, signature);

    const middle: Alignment<T>[] =
        middleSource.length * middleTarget.length <= maxCells
            ? align(middleSource, middleTarget, signature)
            : [
                  ...middleSource.map((item): Alignment<T> => ({
                      kind: 'insert',
                      source: item,
                  })),
                  ...middleTarget.map((item): Alignment<T> => ({
                      kind: 'remove',
                      target: item,
                  })),
              ];

    const result: Alignment<T>[] = [];
    // A common prefix sits at the same index in both arrays by construction.
    for (let i = 0; i < prefix; i++)
        result.push({
            kind: 'keep',
            source: must(source[i], 'a source item'),
            target: must(target[i], 'a target item'),
        });
    result.push(...middle);
    for (let i = 0; i < suffix; i++)
        result.push({
            kind: 'keep',
            source: must(source[source.length - suffix + i], 'a source item'),
            target: must(target[target.length - suffix + i], 'a target item'),
        });
    return result;
}
