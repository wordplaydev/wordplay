import type Caret from '#edit/caret/Caret.ts';
import type { MoveDirection } from '#edit/drag/Drag.ts';
import type Revision from '#edit/revision/Revision.ts';
import { getConceptNameById } from '#locale/getConceptName.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import Block from '#nodes/Block.ts';
import { describesOwnType } from '#nodes/conciseRef.ts';
import type Context from '#nodes/Context.ts';
import Expression from '#nodes/Expression.ts';
import type Node from '#nodes/Node.ts';
import Program from '#nodes/Program.ts';
import type Source from '#nodes/Source.ts';
import Token from '#nodes/Token.ts';
import changedSpan from './changedSpan.ts';
import { previewSpan } from './describeRestore.ts';
import type { Verbosity } from './Verbosity.ts';

/** A markup's text as it should be spoken: `toText()` leaves a concept link as
 *  its source (`@FunctionDefinition`), which a screen reader reads letter by
 *  symbol, so each link becomes the concept's name in the reader's language. */
export function spokenMarkup(text: string, locale: LocaleText): string {
    return text.replace(
        /@([\p{L}\p{N}_]+)/gu,
        (_, id: string) => getConceptNameById(locale, id) ?? id,
    );
}

/**
 * What caused a discrete edit, carrying the structure the cause already knows,
 * which is richer than anything a diff of the two sources could recover.
 */
export type EditCause =
    /** A menu choice. */
    | { kind: 'menu'; revision: Revision }
    /** A drop; `nodes` are the dropped nodes as they now sit in the new source.
     *  `copied` when they came from outside the project (the palette, the
     *  guide, an example) rather than being moved from elsewhere in it. */
    | { kind: 'drop'; nodes: Node[]; copied: boolean }
    /** Nodes dropped in the recycle bin, as they were in the old source. */
    | { kind: 'recycle'; nodes: Node[] }
    /** Search and replace over every match. */
    | { kind: 'replace'; count: number; text: string }
    /** A keyboard move of the selected node or run (moveNode in Drag.ts). */
    | { kind: 'move'; direction: MoveDirection }
    /** A command that changed the code and declared the caret as its feedback. */
    | { kind: 'command'; id: string };

/**
 * What a discrete edit did, for a screen reader, or undefined when the caret
 * announcement already says it. Terse readers hear only the caret.
 *
 * Each cause names what it touched, so two edits in a row differ and neither
 * is dropped as a duplicate. A drop also names where the node landed, since
 * "number 1" alone is the same whether it was moved into the list or the
 * block beside it.
 */
export default function describeEdit(
    before: Source,
    after: Source,
    caret: Caret,
    cause: EditCause,
    locales: Locales,
    context: Context,
    verbosity: Verbosity,
): string | undefined {
    if (verbosity === 'terse') return undefined;

    /** A node as the announcement names it; verbose adds its type. */
    const describe = (node: Node) => {
        const ref = new NodeRef(node, locales, context);
        if (
            verbosity !== 'verbose' ||
            !(node instanceof Expression) ||
            describesOwnType(node)
        )
            return ref;
        return locales
            .concretize((l) => l.ui.edit.node, {
                node: ref,
                type: new NodeRef(
                    node.getType(context).simplify(context),
                    locales,
                    context,
                ),
            })
            .toText();
    };

    switch (cause.kind) {
        case 'menu': {
            const revision = cause.revision;
            if (revision.isRemoval()) {
                const removed = revision.getRemoved()[0];
                return removed === undefined
                    ? undefined
                    : locales
                          .concretize((l) => l.ui.edit.removed, {
                              // The removed node is no longer in any source,
                              // so its static label stands in for a description.
                              node: removed.getLabel(locales),
                          })
                          .toText();
            }
            // The caret announcement names an addition ("number 1, number"),
            // so saying "inserted number 1" first would be the same news twice.
            if (caret.addition !== undefined) return undefined;
            const added = revision.getNewNode(locales);
            return added === undefined
                ? undefined
                : locales
                      .concretize((l) => l.ui.edit.inserted, {
                          node: added.getLabel(locales),
                      })
                      .toText();
        }
        case 'drop': {
            const first = cause.nodes[0];
            if (first === undefined) return undefined;
            const target = holderOf(first, after);
            const inputs = {
                node: describe(first),
                target:
                    target === undefined
                        ? undefined
                        : new NodeRef(target, locales, context),
            };
            return (
                cause.copied
                    ? locales.concretize((l) => l.ui.edit.copied, inputs)
                    : locales.concretize((l) => l.ui.edit.moved, inputs)
            ).toText();
        }
        case 'recycle': {
            const first = cause.nodes[0];
            return first === undefined
                ? undefined
                : locales
                      .concretize((l) => l.ui.edit.removed, {
                          node: first.getLabel(locales),
                      })
                      .toText();
        }
        case 'move': {
            // The moved node is the caret's addition, or the first of a run.
            const moved = caret.addition ?? caret.getSelectedNodes()[0];
            if (moved === undefined) return undefined;
            const node = describe(moved);
            // A swap names the sibling it crossed; a lift or a descent names
            // what now holds the node, which is what changed.
            if (cause.direction === 'before' || cause.direction === 'after') {
                const last = caret.getSelectedNodes().at(-1) ?? moved;
                const parent = after.root.getParent(moved);
                const field = after.root.getContainingParentList(moved);
                const list =
                    parent !== undefined && field !== undefined
                        ? parent.getField(field)
                        : undefined;
                const sibling = Array.isArray(list)
                    ? cause.direction === 'before'
                        ? list[list.indexOf(last) + 1]
                        : list[list.indexOf(moved) - 1]
                    : undefined;
                if (sibling !== undefined) {
                    const inputs = {
                        node,
                        sibling: new NodeRef(sibling, locales, context),
                    };
                    return (
                        cause.direction === 'before'
                            ? locales.concretize(
                                  (l) => l.ui.edit.movedBefore,
                                  inputs,
                              )
                            : locales.concretize(
                                  (l) => l.ui.edit.movedAfter,
                                  inputs,
                              )
                    ).toText();
                }
            }
            const target = holderOf(moved, after);
            return locales
                .concretize((l) => l.ui.edit.moved, {
                    node,
                    target:
                        target === undefined
                            ? undefined
                            : new NodeRef(target, locales, context),
                })
                .toText();
        }
        case 'replace':
            return locales
                .concretize((l) => l.ui.edit.replacedAll, {
                    count: cause.count,
                    text: previewSpan(cause.text),
                })
                .toText();
        case 'command': {
            // The command's own structure is gone by now, so say what text it
            // changed: the stretch that differs, read as code.
            const span = changedSpan(before.getCode(), after.getCode());
            if (span === undefined) return undefined;
            if (span.added.trim().length > 0)
                return locales
                    .concretize((l) => l.ui.edit.inserted, {
                        node: previewSpan(span.added),
                    })
                    .toText();
            if (span.removed.trim().length > 0)
                return locales
                    .concretize((l) => l.ui.edit.removed, {
                        node: previewSpan(span.removed),
                    })
                    .toText();
            return undefined;
        }
    }
}

/** The construct that holds a node, worth naming: not the program or the root
 *  block, which hold every top-level statement, and past a wrapper whose only
 *  text is the node's own (a number literal around its token). */
export function holderOf(node: Node, source: Source): Node | undefined {
    let parent = source.root.getParent(node);
    if (
        node instanceof Token &&
        parent !== undefined &&
        parent.leaves().length === 1
    )
        parent = source.root.getParent(parent);
    return parent === undefined ||
        parent instanceof Program ||
        (parent instanceof Block && parent.isRoot())
        ? undefined
        : parent;
}
