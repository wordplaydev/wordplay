import type {
    MenuPosition,
    Point,
    Size,
} from '#components/editor/menu/menuPlacement.ts';
import type MenuInfo from '#edit/menu/Menu.ts';
import Node, { isFieldPosition } from '#nodes/Node.ts';

/**
 * Where a menu should open, beside what it was opened on: a field's trigger, a
 * node, or the caret. `frame` is the viewport position of the menu's containing
 * block, which positions are made relative to, and `container` is the box that
 * clips it. Shared by ProjectView and the hosts of editable examples.
 */
export function anchorMenu(
    menu: MenuInfo,
    editor: Element,
    frame: Point,
    container: Size,
): MenuPosition | undefined {
    const anchor = menu.getAnchor();

    if (isFieldPosition(anchor)) {
        // The descendant combinator would also match triggers inside
        // nested .node-view children (which can reuse the same field
        // name, e.g. inner and outer Evaluate.inputs), so filter to the
        // trigger whose closest .node-view ancestor is the actual parent.
        const candidates = editor.querySelectorAll(
            `.node-view[data-id="${anchor.parent.id}"] .trigger[data-field="${anchor.field}"]`,
        );
        const trigger = Array.from(candidates).find(
            (t) =>
                t.closest('.node-view')?.getAttribute('data-id') ===
                String(anchor.parent.id),
        );
        if (trigger === undefined) return undefined;
        const triggerBounds = trigger.getBoundingClientRect();
        return {
            left: triggerBounds.left - frame.left,
            top: triggerBounds.bottom - triggerBounds.height / 4 - frame.top,
            container,
        };
    }
    // Is it a node? Position near its top left.
    if (anchor instanceof Node) {
        const view = editor.querySelector(`.node-view[data-id="${anchor.id}"]`);
        if (view === null) return undefined;
        const nodeBounds = view.getBoundingClientRect();
        return {
            left: nodeBounds.left - frame.left,
            top: nodeBounds.bottom - frame.top,
            container,
        };
    }
    // Is it a position? Position at the bottom of the caret.
    if (typeof anchor === 'number') {
        const caretView = editor.querySelector('.caret');
        if (caretView === null) return undefined;
        const caretBounds = caretView.getBoundingClientRect();
        return {
            left: caretBounds.left - frame.left,
            top: caretBounds.bottom - frame.top,
            container,
        };
    }
    return undefined;
}
