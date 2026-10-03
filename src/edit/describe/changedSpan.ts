import type UnicodeString from '#unicode/UnicodeString.ts';

/** The one contiguous stretch of text that differs between two versions. */
export type ChangedSpan = {
    /** The grapheme offset at which the two versions diverge. */
    position: number;
    /** What the earlier version had there; empty for a pure insertion. */
    removed: string;
    /** What the later version has there; empty for a pure deletion. */
    added: string;
};

/**
 * Where two versions of a text differ, by common prefix and suffix over
 * graphemes. This is what a listener wants to hear about an undo or a command
 * ("`(1 + 2)` is back"), and it costs one pass over the graphemes with no
 * allocation beyond the two slices — unlike a tree diff, which fingerprints
 * both whole programs, which an undo of a long program would pay on every press.
 */
export default function changedSpan(
    before: UnicodeString,
    after: UnicodeString,
): ChangedSpan | undefined {
    if (before.getText() === after.getText()) return undefined;
    const a = before.getGraphemes();
    const b = after.getGraphemes();
    const shortest = Math.min(a.length, b.length);
    let prefix = 0;
    while (prefix < shortest && a[prefix] === b[prefix]) prefix++;
    let suffix = 0;
    while (
        suffix < shortest - prefix &&
        a[a.length - 1 - suffix] === b[b.length - 1 - suffix]
    )
        suffix++;
    return {
        position: prefix,
        removed: a.slice(prefix, a.length - suffix).join(''),
        added: b.slice(prefix, b.length - suffix).join(''),
    };
}
