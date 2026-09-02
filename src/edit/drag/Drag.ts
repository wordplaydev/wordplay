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
import type Spaces from '@parser/Spaces';

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
    dragged: Node[],
    target: Node | InsertionPoint | AssignmentPoint,
): [Project, Source, Node[]] {
    const first = dragged[0];
    const root = project.getRoot(first);
    const draggedRoot = root?.root;

    let editedProgram = source.expression;
    let editedSpace = source.spaces;

    // Clone what's being dragged, in case it came with nodes we shouldn't mess with.
    const draggedClones: Node[] = dragged.map((node) => node.clone());

    // First, decide whether to remove the nodes or replace them with a placeholder.
    // We do this based on the field: if it is in a list or can be undefined, then we remove,
    // otherwise we replace with a placeholder. This ensures that we don't introduce a syntax error.

    // Get the field of the first node. A run is always siblings in one list field,
    // so one field describes all of them.
    const field = root?.getParent(first)?.getFieldOfChild(first);

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
                first instanceof Expression && field.kind.allowsKind(Expression)
                ? ExpressionPlaceholder.make(
                      first.getType(project.getContext(source)),
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
    let nodeToFormat: Node = draggedClones[0];

    /** Splice the clones into a list in place of `count` items at `index`. */
    function spliceInto(list: Node[], index: number, count: number) {
        editedProgram = editedProgram.replace(list, [
            ...list.slice(0, index),
            ...draggedClones,
            ...list.slice(index + count),
        ]);
        nodeToFormat =
            editedProgram
                .nodes()
                .find((node) => node.containsChild(draggedClones[0])) ??
            draggedClones[0];
    }

    // Case 1: We're replacing the hovered node with what's being dragged.
    if (target instanceof Node) {
        if (draggedClones.length === 1) {
            // Replace the hovered node in this source with the dragged node.
            editedProgram = editedProgram.replace(target, draggedClones[0]);

            // Give the space of the hovered node to the dragged clone.
            editedSpace = editedSpace.withReplacement(target, draggedClones[0]);

            // Format what was dragged
            nodeToFormat = draggedClones[0];
        } else {
            // A run replaces one item of a list with several. Anywhere else has
            // one slot, which isValidDropTarget has already ruled out.
            const targetParent = project.getRoot(target)?.getParent(target);
            const targetField =
                targetParent === undefined
                    ? undefined
                    : project.getRoot(target)?.getContainingParentList(target);
            const targetList =
                targetParent !== undefined && targetField !== undefined
                    ? targetParent.getField(targetField)
                    : undefined;
            if (targetParent === undefined || !Array.isArray(targetList))
                return [project, source, dragged];
            const index = targetList.indexOf(target);
            if (index < 0) return [project, source, dragged];

            // No space is handed to the clones here. The replaced node's space
            // belonged to its position, and once the origin removal runs the run
            // may sit at a different one — at the head of the list, where that
            // space would read as a stray gap. The destination's preferred
            // spacing below is computed from where the run actually ends up.
            spliceInto(targetList, index, 1);
        }
    }
    // Case 2: We're inserting into a list
    else if (target instanceof InsertionPoint) {
        const insertion = target;
        // Replace the old list with a new one that has the insertion.
        spliceInto(insertion.list, insertion.index, 0);

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

        // Give the space prior to the index to the first dragged node. The rest
        // of a run gets the destination's preferred spacing below: a run moved
        // from statements into an inline list should read like that list, and
        // carrying its own line breaks in would be permanent, since formatting
        // only ever adds them.
        editedSpace = editedSpace.withSpace(draggedClones[0], beforeSpace);
        if (nodeAtIndex) {
            // Make sure the preferred space is there, to avoid parsing issues.
            editedSpace = editedSpace.withSpace(nodeAtIndex, afterSpace);
        }
    }
    // Case 3: We're assigning to an unassigned field.
    else if (target instanceof AssignmentPoint) {
        // A field takes one node; a run has nothing to assign.
        if (draggedClones.length > 1) return [project, source, dragged];
        // Set the field to the dragged clone.
        const revisedParent = target.parent.replace(
            target.field,
            draggedClones[0],
        );
        // Update the edited program (or if the revised parent is a program, use that).
        editedProgram =
            editedProgram instanceof Program && revisedParent instanceof Program
                ? revisedParent
                : editedProgram.replace(target.parent, revisedParent);

        // Format the parent node
        nodeToFormat = revisedParent;
    }

    // If what was dragged came from a Source we have a replacement (undefined or a Node)
    // update the the source. We handle it differently based on whether it was this editors source or another editor's source.
    if (replacement !== null && draggedInSource) {
        /** Take a run out of a tree by identity, one node at a time. Identity
         * rather than the list, because the insertion above may already have
         * rebuilt that list — which is what a move within one list does. No
         * space transfer: Spaces.withReplacement concatenates the gap before a
         * removal onto the gap after it, so doing it per node would leave one
         * blank line per node removed. The follower keeps its own space, and
         * inherits the run's leading one so a run taken from the head of a list
         * doesn't leave the list opening with a gap. */
        const removeRun = (
            tree: Program,
            spaces: Spaces,
        ): [Program, Spaces] => {
            let program = tree;
            for (const node of dragged)
                program = program.replace(node, undefined);
            const parent = draggedRoot.root.getParent(first);
            const containing = draggedRoot.root.getContainingParentList(first);
            const list =
                parent !== undefined && containing !== undefined
                    ? parent.getField(containing)
                    : undefined;
            const following = Array.isArray(list)
                ? list[list.indexOf(dragged[dragged.length - 1]) + 1]
                : undefined;
            return [
                program,
                following === undefined
                    ? spaces
                    : spaces.withSpace(following, spaces.getSpace(first)),
            ];
        };

        // If it's this source, do the replacement on it.
        if (draggedRoot === source) {
            if (dragged.length > 1) {
                [editedProgram, editedSpace] = removeRun(
                    editedProgram,
                    editedSpace,
                );
            } else {
                editedProgram = editedProgram.replace(first, replacement);
                editedSpace = editedSpace.withReplacement(first, replacement);
            }
        }
        // Some other source...
        else {
            // If we found one, update the project with a new source with a new program that replaces the dragged node with the placeholder
            // and preserves the space preceding the dragged node.
            if (dragged.length > 1) {
                const [program, spaces] = removeRun(
                    draggedRoot.expression,
                    draggedRoot.spaces,
                );
                sourceReplacements.push([
                    draggedRoot,
                    draggedRoot.withProgram(program, spaces),
                ]);
            } else
                sourceReplacements.push([
                    draggedRoot,
                    draggedRoot
                        .replace(first, replacement)
                        .withSpaces(
                            draggedRoot.spaces.withReplacement(
                                first,
                                replacement,
                            ),
                        ),
                ]);
        }
    }

    // Removing the run rebuilt this source's tree, so the node captured for
    // formatting is from before the run left — formatting against it spaces the
    // list as it was, and hands a stray gap to whatever the run stood in front of.
    if (draggedInSource && draggedRoot === source && dragged.length > 1)
        nodeToFormat =
            editedProgram
                .nodes()
                .find((node) => node.containsChild(draggedClones[0])) ??
            nodeToFormat;

    // For palette drops (the dragged node came from the Wellspring/Guide rather than from a source),
    // replace any placeholders inside the dropped subtree with reasonable typed defaults, so the
    // dropped concept evaluates immediately instead of throwing a placeholder exception. We scope
    // strictly to the dropped subtree (draggedClone's descendants), leaving placeholders elsewhere in
    // the program untouched, and leave placeholders whose type has no default for the creator to fill.
    let droppedNodes: Node[] = [...draggedClones];
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

        for (const [position, clone] of draggedClones.entries()) {
            // Pair each placeholder in the dropped subtree with its first default, skipping any with none.
            const pairs = clone
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
                    (
                        pair,
                    ): pair is readonly [ExpressionPlaceholder, Expression] =>
                        pair !== undefined,
                );

            if (pairs.length === 0) continue;

            // Build the resolved subtree. Successive replace() is valid: each untouched sibling
            // placeholder keeps its identity (clone only rebuilds the path to the replaced node)
            // until it is itself replaced.
            let resolvedClone: Node = clone;
            for (const [placeholder, def] of pairs)
                resolvedClone = resolvedClone.replace(placeholder, def);

            // Swap the live clone for the resolved subtree in the program and its spacing.
            editedProgram = editedProgram.replace(clone, resolvedClone);
            editedSpace = editedSpace.withReplacement(clone, resolvedClone);

            // Re-point the node to format and the returned node to the live resolved subtree.
            nodeToFormat =
                nodeToFormat === clone
                    ? resolvedClone
                    : (editedProgram
                          .nodes()
                          .find((n) => n.containsChild(resolvedClone)) ??
                      resolvedClone);
            droppedNodes[position] = resolvedClone;
        }
    }

    // Make a new source
    let newSource = source.withProgram(editedProgram, editedSpace);
    newSource = nodeToFormat
        ? newSource.withSpaces(getPreferredSpaces(nodeToFormat, editedSpace))
        : newSource;

    // Finally, add this editor's updated source to the list of sources to replace in the project.
    sourceReplacements.push([source, newSource]);

    return [project.withSources(sourceReplacements), newSource, droppedNodes];
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
export function kindAcceptsDrop(kind: FieldKind, nodes: Node[]): boolean {
    if (nodes.length === 0) return false;
    // A run of nodes can only land where a list can hold it: a single-valued
    // field has one slot, and nothing sensible to do with several nodes.
    if (nodes.length > 1)
        return (
            kind instanceof ListOf &&
            nodes.every((node) => kind.allowsItem(node))
        );
    return kind instanceof ListOf
        ? kind.allowsItem(nodes[0])
        : kind.allows(nodes[0]);
}

/**
 * Given a project, a dragged node, and a target node, determine whether the target is a valid drop target.
 * Valid means that it is syntactically correct, but it may still result in a type error. We permit type errors to allow
 * for more flexible editing, and to help learners reason through what the type should be. When a drop would produce a
 * type error, we don't block it; we explain it (see {@link getDropConflicts}).
 */
export function isValidDropTarget(
    project: Project,
    dragged: Node[],
    target: Node,
): boolean {
    // Is the target inside anything being dragged? If so, we can't drop it there.
    if (dragged.some((node) => node.contains(target))) return false;

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
 * The node a drop target is anchored to in the current tree: the target itself for a node
 * replacement, or the list/field owner for an insertion/assignment point. Used to check whether a
 * drop target still belongs to the live project after a mid-drag revision.
 */
export function targetAnchorNode(
    target: Node | InsertionPoint | AssignmentPoint,
): Node {
    return target instanceof InsertionPoint
        ? target.node
        : target instanceof AssignmentPoint
          ? target.parent
          : target;
}

/**
 * Simulate dropping `dragged` onto `target` in `source` and return the NEW major conflicts (Warning +
 * Error) the drop would introduce, diffed against the project's current major conflicts. Placeholder
 * (minor) conflicts are already excluded by getMajorConflictsNow(), so a drop that only leaves a
 * placeholder behind returns []. Used for FEEDBACK — it returns both blocking (structural) and
 * permitted (semantic) conflicts so the caller can explain a rejection or a warning. Diffs the entire
 * simulated project (not Project.getNewConflicts, which only re-derives a single source) so cross-source
 * drags, where the donor source also changes, are handled correctly.
 */
export function getDropConflicts(
    project: Project,
    source: Source,
    dragged: Node[],
    target: Node | InsertionPoint | AssignmentPoint,
): { conflicts: Conflict[]; project: Project } {
    // Stale target guard: a mid-drag project revision (e.g. a temporal stream tick) replaces the tree
    // with new node identities, but the drag stores still reference old nodes. Simulating a drop whose
    // target anchor is no longer in the project would splice against a mismatched tree and can throw,
    // so treat it as introducing no conflicts (the actual drop path no-ops too). We don't gate on the
    // dragged node: a rootless dragged node is the normal palette-drop case, handled by dropNodeOnSource.
    if (!project.contains(targetAnchorNode(target)))
        return { conflicts: [], project };

    const [newProject] = dropNodeOnSource(project, source, dragged, target);
    // `before` comes from the live project's CACHED analysis (the app already computed it for the
    // annotations UI), so it usually costs nothing. When there isn't one — analysis is skipped
    // during a typing flurry — compute it, because taking "no analysis" for "no conflicts" would
    // make every conflict the program already had look like one this drop introduced. `after` must
    // be computed fresh on the never-analyzed newProject; getMajorConflictsNow() is the right tool
    // for both because it computes conflicts only, skipping the call and dependency graphs that a
    // full analysis would also build, and it already excludes minor conflicts.
    const before =
        project.getConflicts()?.filter((c) => !c.isMinor()) ??
        project.getMajorConflictsNow();
    const after = newProject.getMajorConflictsNow();
    // The conflicts reference nodes in newProject, so return it too for resolving their context.
    return {
        conflicts: after.filter((a) => !before.some((b) => b.isEqualTo(a))),
        project: newProject,
    };
}

/** The subset of {@link getDropConflicts} that is BLOCKING — the conflicts that make a drop invalid
 * in blocks mode (unparsable code). Semantic conflicts (type mismatches, unknown names) are excluded,
 * whatever their severity: they're explained, not blocked. */
export function getBlockingDropConflicts(
    project: Project,
    source: Source,
    dragged: Node[],
    target: Node | InsertionPoint | AssignmentPoint,
): Conflict[] {
    return getDropConflicts(project, source, dragged, target).conflicts.filter(
        (c) => c.isBlocking(),
    );
}

/**
 * True if every source the drop edited prints to text that reparses to the same structure. The
 * conflict analysis runs on the edited TREE, so it can't see breakage that only appears in the
 * printed program — e.g. moving a definition's only Name away leaves `•(...)`, which is a fine
 * tree but unparsable text. Only sources the drop changed are checked (the rest are shared by
 * identity and came from text in the first place).
 */
function dropRoundTrips(before: Project, after: Project): boolean {
    return after
        .getSources()
        .every(
            (source) =>
                before.getSources().includes(source) ||
                new Source(
                    'test',
                    source.getCode().toString(),
                ).expression.isStructurallyEqualTo(source.expression),
        );
}

/**
 * Whether a drop is permitted: structurally valid, introducing no blocking (unparsable) conflict,
 * and printing to text that means the same program. This mirrors the typing/paste policy —
 * semantic conflicts of any severity are permitted and explained, only structural breakage is
 * blocked. For a Node target we run the cheap structural {@link isValidDropTarget} first;
 * InsertionPoint/AssignmentPoint targets were already structurally validated at detection time
 * (PointerUtilities), so we only conflict-check them.
 */
export function isDropPermitted(
    project: Project,
    source: Source,
    dragged: Node[],
    target: Node | InsertionPoint | AssignmentPoint,
): boolean {
    if (target instanceof Node && !isValidDropTarget(project, dragged, target))
        return false;
    const { conflicts, project: simulated } = getDropConflicts(
        project,
        source,
        dragged,
        target,
    );
    return (
        !conflicts.some((conflict) => conflict.isBlocking()) &&
        dropRoundTrips(project, simulated)
    );
}

/**
 * The node a drop should replace when the pointer is over `hovered`, checked
 * STRUCTURALLY only — no drop simulation, no conflict analysis. In blocks mode
 * the most-specific node under the pointer (e.g. a call's function name) often
 * can't accept the dragged node even though an enclosing node can; walk from
 * `hovered` outward and return the SMALLEST enclosing node that structurally
 * accepts it, or `hovered` itself when nothing does (so the original rejection
 * is still explained). Used during pointer MOVEMENT, where a conflict-checked
 * walk (a full-project analysis per ancestor candidate, per node the pointer
 * crosses) froze drags for tens of seconds on large sources. Conflicts are
 * checked when the pointer rests (debounced feedback) and at release
 * ({@link resolvePermittedDropTarget}, the authoritative gate), so a
 * conflict-blocked target can never actually receive a drop.
 */
export function resolveStructuralReplacementTarget(
    project: Project,
    dragged: Node[],
    hovered: Node,
): Node {
    const root = project.getRoot(hovered);
    if (root === undefined) return hovered;
    for (const candidate of root.getSelfAndAncestors(hovered))
        if (isValidDropTarget(project, dragged, candidate)) return candidate;
    return hovered;
}

/**
 * The target a RELEASE should actually drop on. Candidates are `target` itself and up to `limit`
 * enclosing nodes; the winner is the nearest candidate whose drop introduces NO new conflict at all,
 * falling back to the nearest merely permitted one (no blocking conflict; semantic warnings ride
 * along), and undefined only when every candidate is structurally blocked — e.g. a drop released on
 * a call's function name lands on the call when only the name would conflict. Preferring the clean
 * interpretation over the nearest warned one is what keeps a drop on a call's glyph replacing the
 * call, not the function name. This is the drag's ONE conflict-checked resolution: each candidate is
 * a full-project drop simulation, so it runs once at release and is bounded so a long ancestor chain
 * can't stall the pointer-up.
 */
export function resolvePermittedDropTarget(
    project: Project,
    source: Source,
    dragged: Node[],
    target: Node | InsertionPoint | AssignmentPoint,
    limit = 3,
): Node | InsertionPoint | AssignmentPoint | undefined {
    // Gather the candidates: the target, and for node targets, up to limit ancestors.
    const candidates: (Node | InsertionPoint | AssignmentPoint)[] = [target];
    if (target instanceof Node) {
        const root = project.getRoot(target);
        let candidate = root?.getParent(target);
        for (let i = 0; i < limit && candidate !== undefined; i++) {
            candidates.push(candidate);
            candidate = root?.getParent(candidate);
        }
    }
    let warned: Node | InsertionPoint | AssignmentPoint | undefined = undefined;
    for (const candidate of candidates) {
        // Structurally invalid candidates are out entirely.
        if (
            candidate instanceof Node &&
            !isValidDropTarget(project, dragged, candidate)
        )
            continue;
        // One simulation per candidate answers every question.
        const { conflicts, project: simulated } = getDropConflicts(
            project,
            source,
            dragged,
            candidate,
        );
        if (conflicts.some((conflict) => conflict.isBlocking())) continue;
        if (!dropRoundTrips(project, simulated)) continue;
        if (conflicts.length === 0) return candidate;
        // A placeholder is an explicit "drop here" slot: a permitted drop on one lands there even
        // when it warns, since building through a type mismatch is exactly what the slot is for.
        // Other warned candidates only win when no enclosing candidate is conflict-free.
        if (
            candidate === target &&
            candidate instanceof Node &&
            candidate.isPlaceholder()
        )
            return candidate;
        warned ??= candidate;
    }
    return warned;
}
