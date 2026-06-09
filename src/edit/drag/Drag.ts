import type Conflict from '@conflicts/Conflict';
import type Project from '@db/projects/Project';
import Block from '@nodes/Block';
import Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import Node, { type FieldKind, ListOf } from '@nodes/Node';
import Program from '@nodes/Program';
import Source from '@nodes/Source';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import TypePlaceholder from '@nodes/TypePlaceholder';
import getPreferredSpaces from '@parser/getPreferredSpaces';

/**
 * Represents a node, list on the node, and index in the list at which to insert a node.
 * Used for rendering and for drag and drop.
 */
export class InsertionPoint {
    /** The node before the insertion point. */
    readonly node: Node;
    /** The optional token before the insertion point, if in text mode. */
    readonly token: Token | undefined;
    /** The field the insertion point corresponds to. */
    readonly field: string;
    /** The list being inserted into */
    readonly list: Node[];
    /** The local line index in the space prior the node, from 0 to n */
    readonly line: number | undefined;
    /** The index into the list being inserted into. */
    readonly index: number;

    constructor(
        node: Node,
        field: string,
        list: Node[],
        token: Token | undefined,
        line: number | undefined,
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

/** Represents a field that could be assigned. */
export class AssignmentPoint {
    readonly parent: Node;
    readonly field: string;

    constructor(parent: Node, field: string) {
        this.parent = parent;
        this.field = field;
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
    target: Node | InsertionPoint | AssignmentPoint,
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
    let nodeToFormat: Node = draggedClone;

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
    else if (target instanceof InsertionPoint) {
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
            if (insertion.line !== undefined && count > insertion.line) break;
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
    // Case 3: We're assigning to an unassigned field.
    else if (target instanceof AssignmentPoint) {
        // Set the field to the dragged clone.
        const revisedParent = target.parent.replace(target.field, draggedClone);
        // Update the edited program (or if the revised parent is a program, use that).
        editedProgram =
            editedProgram instanceof Program && revisedParent instanceof Program
                ? revisedParent
                : editedProgram.replace(target.parent, revisedParent);

        // Format the parent node
        nodeToFormat = revisedParent;
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

    // For palette drops (the dragged node came from the Wellspring/Guide rather than from a source),
    // replace any placeholders inside the dropped subtree with reasonable typed defaults, so the
    // dropped concept evaluates immediately instead of throwing a placeholder exception. We scope
    // strictly to the dropped subtree (draggedClone's descendants), leaving placeholders elsewhere in
    // the program untouched, and leave placeholders whose type has no default for the creator to fill.
    let droppedNode: Node = draggedClone;
    if (!draggedInSource) {
        // Build a provisional source and project so each placeholder's computeType() has a context to
        // walk up to its parent Evaluate/Bind and resolve its expected input type.
        const provisionalSource = source.withProgram(
            editedProgram,
            editedSpace,
        );
        const provisionalProject = project.withSources([
            ...sourceReplacements,
            [source, provisionalSource],
        ]);
        const context = provisionalProject.getContext(provisionalSource);
        const locales = project.getLocales();

        // Pair each placeholder in the dropped subtree with its first default, skipping any with none.
        const pairs = draggedClone
            .nodes(
                (n): n is ExpressionPlaceholder =>
                    n instanceof ExpressionPlaceholder,
            )
            .map((placeholder) => {
                const def = ExpressionPlaceholder.getDefaultExpressions(
                    placeholder,
                    context,
                    locales,
                )[0];
                return def ? ([placeholder, def] as const) : undefined;
            })
            .filter(
                (pair): pair is readonly [ExpressionPlaceholder, Expression] =>
                    pair !== undefined,
            );

        if (pairs.length > 0) {
            // Build the resolved subtree. Successive replace() is valid: each untouched sibling
            // placeholder keeps its identity (clone only rebuilds the path to the replaced node)
            // until it is itself replaced.
            let resolvedClone: Node = draggedClone;
            for (const [placeholder, def] of pairs)
                resolvedClone = resolvedClone.replace(placeholder, def);

            // Swap the live draggedClone for the resolved subtree in the program and its spacing.
            editedProgram = editedProgram.replace(draggedClone, resolvedClone);
            editedSpace = editedSpace.withReplacement(
                draggedClone,
                resolvedClone,
            );

            // Re-point the node to format and the returned node to the live resolved subtree.
            nodeToFormat =
                nodeToFormat === draggedClone
                    ? resolvedClone
                    : (editedProgram
                          .nodes()
                          .find((n) => n.containsChild(resolvedClone)) ??
                      resolvedClone);
            droppedNode = resolvedClone;
        }
    }

    // Make a new source
    let newSource = source.withProgram(editedProgram, editedSpace);
    newSource = nodeToFormat
        ? newSource.withSpaces(getPreferredSpaces(nodeToFormat, editedSpace))
        : newSource;

    // Finally, add this editor's updated source to the list of sources to replace in the project.
    sourceReplacements.push([source, newSource]);

    return [project.withSources(sourceReplacements), newSource, droppedNode];
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

/**
 * True if a field governed by `kind` can structurally accept `node` — as the field's whole value, or
 * as an item when the field is a list. This is the single structural check shared by every drop path
 * (node replacement, list insertion, and field assignment) so they can't drift apart.
 */
export function kindAcceptsDrop(kind: FieldKind, node: Node): boolean {
    return kind instanceof ListOf ? kind.allowsItem(node) : kind.allows(node);
}

/**
 * Given a project, a dragged node, and a target node, determine whether the target is a valid drop target.
 * Valid means that it is syntactically correct, but it may still result in a type error. We permit type errors to allow
 * for more flexible editing, and to help learners reason through what the type should be. When a drop would produce a
 * type error, we don't block it; we explain it (see {@link getDropConflicts}).
 */
export function isValidDropTarget(
    project: Project,
    dragged: Node,
    target: Node,
): boolean {
    // Is the target inside the dragged node? If so, we can't drop it there.
    if (dragged.contains(target)) return false;

    // What field is the target currently set on?
    const field = project
        .getRoot(target)
        ?.getParent(target)
        ?.getFieldOfChild(target);

    // No field? That's weird. Bail.
    if (field === undefined) return false;

    // Field doesn't allow the dragged node? Not a valid target.
    if (!kindAcceptsDrop(field.kind, dragged)) return false;

    // Structurally valid. We permit type errors, so this is a valid drop target.
    return true;
}

/**
 * Simulate dropping `dragged` onto `target` in `source` and return the NEW major conflicts (Warning +
 * Error) the drop would introduce, diffed against the project's current major conflicts. Placeholder
 * (minor) conflicts are already excluded by getMajorConflictsNow(), so a drop that only leaves a
 * placeholder behind returns []. Used for FEEDBACK — it returns both blocking (Error) and permitted
 * (Warning) conflicts so the caller can explain a rejection or a type-mismatch warning. Diffs the entire
 * simulated project (not Project.getNewConflicts, which only re-derives a single source) so cross-source
 * drags, where the donor source also changes, are handled correctly.
 */
export function getDropConflicts(
    project: Project,
    source: Source,
    dragged: Node,
    target: Node | InsertionPoint | AssignmentPoint,
): { conflicts: Conflict[]; project: Project } {
    const [newProject] = dropNodeOnSource(project, source, dragged, target);
    // `before` comes from the live project's CACHED analysis (the app already computed it for the
    // annotations UI), so it costs nothing. `after` must be computed fresh on the never-analyzed
    // newProject; getMajorConflictsNow() is the right tool there because it computes conflicts only,
    // skipping the evaluation/dependency graphs that full analysis would also build.
    const before = project.getConflicts().filter((c) => !c.isMinor());
    const after = newProject.getMajorConflictsNow();
    // The conflicts reference nodes in newProject, so return it too for resolving their context.
    return {
        conflicts: after.filter((a) => !before.some((b) => b.isEqualTo(a))),
        project: newProject,
    };
}

/** The subset of {@link getDropConflicts} that is BLOCKING (Error severity) — the conflicts that make a
 * drop invalid in blocks mode (e.g. an unknown name). Warning conflicts (type mismatches) are excluded. */
export function getBlockingDropConflicts(
    project: Project,
    source: Source,
    dragged: Node,
    target: Node | InsertionPoint | AssignmentPoint,
): Conflict[] {
    return getDropConflicts(project, source, dragged, target).conflicts.filter(
        (c) => c.isBlocking(),
    );
}

/**
 * Whether a drop is permitted: structurally valid AND introducing no blocking (Error) conflict. This
 * mirrors the typing/paste policy — Warning and Minor conflicts are permitted, Error is blocked. For a
 * Node target we run the cheap structural {@link isValidDropTarget} first; InsertionPoint/AssignmentPoint
 * targets were already structurally validated at detection time (PointerUtilities), so we only
 * conflict-check them.
 */
export function isDropPermitted(
    project: Project,
    source: Source,
    dragged: Node,
    target: Node | InsertionPoint | AssignmentPoint,
): boolean {
    if (target instanceof Node && !isValidDropTarget(project, dragged, target))
        return false;
    return (
        getBlockingDropConflicts(project, source, dragged, target).length === 0
    );
}
