import type Project from '@db/projects/Project';
import type Caret from '@edit/caret/Caret';
import Evaluate from '@nodes/Evaluate';

/**
 * The innermost output the caret is inside, if any — the output a creator would
 * expect the palette to be editing.
 *
 * Shared by the palette, which selects what this finds, and ProjectView, which
 * clears the selection when it finds nothing. Those two run under different
 * conditions (the palette only exists while its tile is visible) but must agree
 * on what "inside an output" means, so the walk lives here rather than in either.
 *
 * Only positions *inside* an output count. The caret resolves through the token
 * following it, so the space before an output would otherwise read as inside it —
 * sitting on the blank line above a `Stage` would select the Stage. Candidates
 * that begin after the caret are skipped, which also means the caret keeps
 * selecting the enclosing output when it sits in the space before a nested one.
 *
 * Whitespace *within* an output still counts, since the indentation on a
 * multi-line output's continuation lines is interior to it.
 */
export default function outputAtCaret(
    caret: Caret,
    project: Project,
): Evaluate | undefined {
    const node = caret.getToken() ?? caret.getExpressionAt();
    if (node === undefined) return undefined;
    const position = typeof caret.position === 'number' ? caret.position : undefined;
    return [node, ...caret.source.root.getAncestors(node)].find(
        (n): n is Evaluate => {
            if (
                !(n instanceof Evaluate) ||
                !n.isOneOf(
                    project.getNodeContext(n),
                    project.shares.output.Phrase,
                    project.shares.output.Group,
                    project.shares.output.Shape,
                    project.shares.output.Stage,
                    project.shares.output.Music,
                )
            )
                return false;
            if (position === undefined) return true;
            const start = caret.source.getNodeFirstPosition(n);
            return start === undefined || start <= position;
        },
    );
}
