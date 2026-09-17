import type Caret from '@edit/caret/Caret';
import type { SourceDiff } from '@edit/diff/sourceDiff';
import type Locales from '@locale/Locales';
import type Node from '@nodes/Node';

/**
 * What the caret has landed on, for the editor's caret announcement (#633).
 *
 * Phrased as the consequence of the button beside it — what restoring would do
 * — because that is the decision being made, and "comes back" says more than
 * "added" ever did. The inline marks are `aria-hidden` (reading them in the
 * flow would interleave two versions of the program into one unreadable
 * stream), so this is how the difference reaches someone not looking at them.
 *
 * It appends to the caret's own description rather than announcing on its own:
 * a bare "comes back if you restore" is constant, and a live region that
 * doesn't change is heard once and then sounds broken.
 *
 * It lives here rather than on `Caret`, which has no business knowing that
 * checkpoints exist.
 */
export default function describeDiffAtCaret(
    caret: Caret,
    diff: SourceDiff | undefined,
    locales: Locales,
): string | undefined {
    // The common case by far: not viewing an older version at all.
    if (diff === undefined) return undefined;

    const token = caret.getTokenExcludingSpace();
    if (token === undefined) return undefined;

    const entry = diff.tokens.get(token);
    if (entry === undefined) return undefined;

    const onlyNow = [
        ...(entry.onlyNowBefore ?? []),
        ...(entry.onlyNowAfter ?? []),
    ];
    if (onlyNow.length === 0)
        return entry.onlyHere
            ? // Primary locale only, like every announcement: a joined
              // string reads as each language back to back.
              locales.getPrimaryPlainText(
                  (l) => l.ui.checkpoints.diff.atReturns,
              )
            : undefined;

    return locales
        .concretize(
            (l) =>
                entry.onlyHere
                    ? l.ui.checkpoints.diff.atBoth
                    : l.ui.checkpoints.diff.atLeaves,
            { code: codeOf(onlyNow) },
        )
        .toText();
}

/**
 * The current version's code as text. Read aloud, so it is the tokens' own text
 * with single spaces between them rather than the source's layout — a newline
 * and an indent say nothing to a listener.
 */
function codeOf(nodes: Node[]): string {
    return nodes
        .flatMap((node) => node.leaves())
        .map((token) => token.getText())
        .join(' ');
}
