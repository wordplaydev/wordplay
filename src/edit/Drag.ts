import Source from '@nodes/Source';
import Node, { ListOf } from '@nodes/Node';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import TypePlaceholder from '@nodes/TypePlaceholder';
import Type from '@nodes/Type';
import type Project from '@models/Project';
import Token from '@nodes/Token';
import Sym from '@nodes/Sym';
import Program from '@nodes/Program';
import Block from '@nodes/Block';
import Bind from '../nodes/Bind';
import getPreferredSpaces from '@parser/getPreferredSpaces';

/**
 * Represents a node, list on the node, and index in the list at which to insert a node.
 * Used for rendering and for drag and drop.
 */
export class InsertionPoint {
    /** The node before the insertion point. */
    readonly node: Node;
    /** The token before the insertion point. */
    readonly token: Token;
    /** The field the insertion point corresponds to. */
    readonly field: string;
    /** The list being inserted into */
    readonly list: Node[];
    /** The local line index in the space prior the node, from 0 to n */
    readonly line: number;
    /** The index into the list being inserted into. */
    readonly index: number;

    constructor(
        node: Node,
        field: string,
        list: Node[],
        token: Token,
        line: number,
        index: number,
    ) {
        this.node = node;
        this.field = field;
        this.list = list;
        this.token = token;
        this.line = line;
        this.index = index;
    }

    equals(insertion: InsertionPoint): boolean {
        return (
            this.node === insertion.node &&
            this.list === insertion.list &&
            this.token === insertion.token &&
            this.line === insertion.line &&
            this.index === insertion.index
        );
    }
}

/**
 * Given a project, a source in that project, a node being dragged, and either a node hovered over or an insertion point,
 * drop the node hover the hovered node or at the insertion point, returning a revised project and a reference to the
 * node that was inserted.
 */
export function dropNodeOnSource(
    project: Project,
    source: Source,
    dragged: Node,
    target: Node | InsertionPoint,
): [Project, Source, Node] {
    const root = project.getRoot(dragged);
    const draggedRoot = root?.root;

    let editedProgram = source.expression;
    let editedSpace = source.spaces;

    // Clone the dragged node in case it came with nodes that we shouldn't mess with.
    const draggedNode = dragged;
    const draggedClone: Node = draggedNode.clone();

    // First, decide whether to remove the node or replace it with a placeholder.
    // We do this based on the node's field: if it is in a list or can be undefined, then we remove,
    // otherwise we replace with a placeholder. This ensures that we don't introduce a syntax error.

    // Get the field of the node.
    const field = root?.getParent(dragged)?.getFieldOfChild(dragged);

    // Get the root of the dragged program.
    const draggedInSource = draggedRoot instanceof Source;

    const replacement =
        // Not in a program? Don't do a replacement (which we represent with null).
        field === undefined || !draggedInSource
            ? null
            : // Does the field allow undefined or the field is a list? Replace with undefined (which means unset or remove from the list).
              field.kind.isOptional() || field.kind instanceof ListOf
              ? undefined
              : // Is the node an expression and the field allows expressions? Replace with an expression placeholder of the type of the current expression.
                dragged instanceof Expression &&
                  field.kind.allowsKind(Expression)
                ? ExpressionPlaceholder.make(
                      dragged.getType(project.getContext(source)),
                  )
                : // Is the field a type? Replace with a type placeholder.
                  field.kind.allowsKind(Type)
                  ? new TypePlaceholder()
                  : // Otherwise, don't do a replacement.
                    null;

    // This is a list of sources to replace with other sources. This can be
    // one or more sources, since it's possible to drag from one source to another.
    const sourceReplacements: [Source, Source][] = [];

    // This should be the node to pretty print after dropping, to ensure semantic spacing is intact.
    let nodeToFormat: Node;

    // Case 1: We're replacing the hovered node with the dragged node.
    if (target instanceof Node) {
        // Replace the hovered node in this source with the dragged node.
        editedProgram = editedProgram.replace(target, draggedClone);

        // Give the space of the hovered node to the dragged clone.
        editedSpace = editedSpace.withReplacement(target, draggedClone);

        // Format what was dragged
        nodeToFormat = draggedClone;
    }
    // Case 2: We're inserting into a list
    else {
        const insertion = target;
        // Replace the old list with a new one that has the insertion.
        editedProgram = editedProgram.replace(insertion.list, [
            ...insertion.list.slice(0, insertion.index),
            draggedClone,
            ...insertion.list.slice(insertion.index),
        ]);

        // Format the node containing the list
        nodeToFormat =
            editedProgram
                .nodes()
                .find((node) => node.containsChild(draggedClone)) ??
            draggedClone;

        // Find the node at the index. It's either the node in the list at the index or or the token after the list,
        // which might be empty. To find this, we ask the node the list is in
        // We get the token
        const nodeAtIndex =
            insertion.list[insertion.index] ??
            // Get the node after the list field
            insertion.node.getNodeAfterField(insertion.field) ??
            // And if there's not one of those, get the token after the node.
            editedProgram.getLeafAfter(insertion.node) ??
            // Otherwise, default to the end token.
            editedProgram.end;

        // Find the space before the node, if there is one.
        const space = nodeAtIndex ? editedSpace.getSpace(nodeAtIndex) : '';

        // Find the index of the insertion line
        let index = 0;
        let count = 0;
        for (; index < space.length; index++) {
            if (space.charAt(index) === '\n') count++;
            if (count > insertion.line) break;
        }

        // Split it based on the line number in the preceding space.
        const beforeSpace = space.substring(0, index);
        const afterSpace = space.substring(index);

        // Give the space prior to the index to the dragged node.
        editedSpace = editedSpace.withSpace(draggedClone, beforeSpace);
        if (nodeAtIndex) {
            // Make sure the preferred space is there, to avoid parsing issues.
            editedSpace = editedSpace.withSpace(nodeAtIndex, afterSpace);
        }
    }

    // If the dragged node came from a Source we have a replacement (undefined or a Node)
    // update the the source. We handle it differently based on whether it was this editors source or another editor's source.
    if (replacement !== null && draggedInSource) {
        // If it's this source, do the replacement on it.
        if (draggedRoot === source) {
            editedProgram = editedProgram.replace(draggedNode, replacement);
            editedSpace = editedSpace.withReplacement(draggedNode, replacement);
        }
        // Some other source...
        else {
            // If we found one, update the project with a new source with a new program that replaces the dragged node with the placeholder
            // and preserves the space preceding the dragged node.
            sourceReplacements.push([
                draggedRoot,
                draggedRoot
                    .replace(draggedNode, replacement)
                    .withSpaces(
                        draggedRoot.spaces.withReplacement(
                            draggedNode,
                            replacement,
                        ),
                    ),
            ]);
        }
    }

    // Make a new source
    let newSource = source.withProgram(editedProgram, editedSpace);
    newSource = newSource.withSpaces(
        getPreferredSpaces(nodeToFormat, editedSpace),
    );

    // Finally, add this editor's updated source to the list of sources to replace in the project.
    sourceReplacements.push([source, newSource]);

    return [project.withSources(sourceReplacements), newSource, draggedClone];
}

export function getInsertionPoint(
    source: Source,
    node: Node,
    after: boolean,
    token: Token,
    line: number,
) {
    const parent = source.root.getParent(node);
    if (parent === undefined) return;

    // Special case the end token of the Program, since it's block has no delimters.
    if (node instanceof Token && node.isSymbol(Sym.End)) {
        if (parent instanceof Program && parent.expression instanceof Block) {
            return new InsertionPoint(
                parent.expression,
                'statements',
                parent.expression.statements,
                node,
                line,
                // The index is at the end of the statements.
                parent.expression.statements.length,
            );
        }
    }

    // Find the list this node is either in or delimits.
    const field = source.root.getContainingParentList(node, after);
    if (field === undefined) return;
    const list = parent.getField(field);
    if (!Array.isArray(list)) return undefined;
    const index = list.length === 0 ? 0 : list.indexOf(node);
    if (index < 0) return;

    return new InsertionPoint(
        parent,
        field,
        list,
        token,
        line,
        // Account for empty lists
        index + (after ? 0 : 1),
    );
}

export function isValidDropTarget(
    project: Project,
    dragged: Node | undefined,
    target: Node | undefined,
    insertion: InsertionPoint | undefined,
): boolean {
    if (dragged === undefined) return false;

    // Allow expressions to be dropped on expressions.
    // Find the field the hovered node corresponds to.
    if (target) {
        const field = project
            .getRoot(target)
            ?.getParent(target)
            ?.getFieldOfChild(target);

        // If we found a field and the dragged node is an instanceof one of the allowed types, it's a valid drop target.
        if (
            field &&
            field.kind.allowsKind(dragged.constructor) &&
            // Don't allow drops on nodes that are children of the dragged node.
            !dragged.contains(target)
        )
            return true;
    }

    // Allow binds to be dropped on children of blocks.
    if (target && dragged instanceof Bind) {
        const hoverParent = project.getRoot(target)?.getParent(target);
        if (
            hoverParent instanceof Block &&
            hoverParent.statements.includes(target as Expression)
        )
            return true;
    }

    // Allow types to be dropped on types.
    if (dragged instanceof Type && target instanceof Type) return true;

    // Allow inserts to be inserted.
    if (insertion) return true;

    return false;
}
