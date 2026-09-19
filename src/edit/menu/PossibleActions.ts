import type Caret from '@edit/caret/Caret';
import MenuAction from '@edit/menu/MenuAction';
import Expression from '@nodes/Expression';
import type Evaluator from '@runtime/Evaluator';
import { canExport } from '@values/export/canExport';
import type Value from '@values/Value';

/**
 * What the menu can do to the selected node, beside changing it.
 *
 * A separate function from `getEditsAt` rather than a branch inside it, which
 * is what keeps actions out of `soundRevisions` (a parse round trip that means
 * nothing here) and out of the purpose grouping. Called only when the menu
 * opens, so its cost is a click's worth, not a keystroke's — and it asks only
 * `canExport`, which is an O(1) class test, never the walk that reshapes a
 * value.
 */
export default function getActionsAt(
    caret: Caret,
    evaluator: Evaluator | undefined,
    onExport: (value: Value) => void,
): MenuAction[] {
    const node = caret.position;
    if (!(node instanceof Expression) || evaluator === undefined) return [];

    // The value this expression last produced. A node the program hasn't
    // reached has none, and then there is nothing to offer — you can save a
    // value where you can see one.
    const value = evaluator.getLatestExpressionValue(node);
    if (value === undefined || !canExport(value)) return [];

    return [
        new MenuAction(
            'export-value',
            (l) => l.ui.export.label,
            () => onExport(value),
        ),
    ];
}
