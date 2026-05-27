import type { Explainer } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Locales from '@locale/Locales';
import type Markup from '@nodes/Markup';
import type Node from '@nodes/Node';

/**
 * Construct an {@link Explainer} resolution — used when no auto-fix is
 * practical and the goal is to walk the learner through what's wrong and
 * point them at where to act. The UI renders these without an apply button;
 * clicking moves the caret to `focusNode` when provided.
 *
 * Issue #827: every conflict offers at least one resolution. Conflicts whose
 * fix needs human judgment (cycles, broad rewrites) ship an explainer; most
 * other conflicts ship a {@link Repair} instead.
 */
export function explain(
    description: (locales: Locales, context: Context) => Markup,
    focusNode?: Node,
): Explainer {
    return focusNode === undefined
        ? { kind: 'explain', description }
        : { kind: 'explain', description, focusNode };
}
