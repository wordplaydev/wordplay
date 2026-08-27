/**
 * Adding output from the palette's toolbar.
 *
 * The palette used to create output by *transforming the whole program* — wrap
 * this text in a @Phrase, wrap that @Phrase in a @Group — which meant each offer
 * disappeared as soon as its type existed, and that composing a layout out of
 * several phrases was not something the palette could do at all. These functions
 * insert instead: they decide WHERE a new output goes (beside the selection,
 * inside whatever container holds it), WHERE on stage it lands (below what's
 * already there, so it doesn't arrive on top of it), and hand back the node they
 * made so the caller can select it.
 *
 * Pure and free of Svelte, so every decision here is unit-tested.
 */

import type { Database } from '@db/Database';
import type Project from '@db/projects/Project';
import { Projects } from '@db/projects/Projects';
import { getFormAnchor, translateFormTo } from '@edit/output/editShape';
import type Locales from '@locale/Locales';
import Block from '@nodes/Block';
import Token from '@nodes/Token';
import Evaluate from '@nodes/Evaluate';
import Convert from '@nodes/Convert';
import type Expression from '@nodes/Expression';
import Input from '@nodes/Input';
import ListLiteral from '@nodes/ListLiteral';
import type Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import Spread from '@nodes/Spread';
import type StructureDefinition from '@nodes/StructureDefinition';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import Unit from '@nodes/Unit';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import type Output from '@output/Output/Output';
import Stage from '@output/Output/Stage';
import type { OutputInfoSet } from '@output/animation/Animator';
import {
    classifyOutput,
    createPlaceholderPhrase,
    getStage,
} from '@components/palette/editOutput';

/** The kinds of content the toolbar can add. */
export type InsertKind =
    'phrase' | 'rectangle' | 'circle' | 'polygon' | 'music' | 'say';

/** The three Forms a Shape can take, which is why there is a button per form
 *  rather than one Shape button: nothing in the palette can turn a Rectangle
 *  into a Circle after the fact. */
export const FormKinds = ['rectangle', 'circle', 'polygon'] as const;
export type FormKind = (typeof FormKinds)[number];

export function isFormKind(kind: InsertKind): kind is FormKind {
    return (FormKinds as readonly string[]).includes(kind);
}

/** How far below existing content a newly added output lands, in metres. */
export const InsertGap = 1;

/** A laid-out box, in the coordinates of the container that holds it. */
export type ContentBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

/** Where new content goes. A `list` is a @Group's or @Stage's content; a
 *  `block` is the program itself, whose result expressions become the stage's
 *  children directly. */
export type InsertionPoint =
    | { kind: 'list'; list: ListLiteral; index: number; container: Evaluate }
    | { kind: 'block'; block: Block };

/** The program's root block. */
function blockOf(project: Project): Block {
    return project.getMain().expression.expression;
}

/**
 * Where a new output of the given kind should go, given what's selected.
 *
 * Beside the selection when it can be: adding into the group you were just
 * editing is what makes composing a layout feel direct. But a container's
 * content type is a real constraint — `Group.content` is
 * `[Phrase|Group|Say|Music|ø]` and excludes Shape — so a form button with a
 * phrase selected inside a Group falls through to the stage rather than
 * producing a type error. Adding is always legal *somewhere*, so no add button
 * is ever inactive for want of a home.
 */
export function insertionPoint(
    project: Project,
    selected: Evaluate[],
    kind: InsertKind,
): InsertionPoint {
    const list =
        selected.length > 0 ? listHolding(project, selected[0]) : undefined;
    if (list !== undefined && listAccepts(project, list.container, kind))
        return list;

    // No usable selection: into the stage's content when there is a stage.
    const stage = getStage(project);
    if (stage !== undefined) {
        const content = stage.getInput(
            project.shares.output.Stage.inputs[0],
            project.getNodeContext(stage),
        );
        if (content instanceof ListLiteral)
            return {
                kind: 'list',
                list: content,
                index: content.values.length,
                container: stage,
            };
    }

    // Otherwise a new result expression, which becomes a stage child of its own.
    return { kind: 'block', block: blockOf(project) };
}

/** The content list the given output sits directly inside, and where in it. */
function listHolding(
    project: Project,
    output: Evaluate,
): Extract<InsertionPoint, { kind: 'list' }> | undefined {
    const root = project.getRoot(output);
    if (root === undefined) return undefined;
    const ancestors = root.getAncestors(output);
    const list = ancestors[0];
    if (!(list instanceof ListLiteral)) return undefined;
    const container = ancestors[1];
    if (!(container instanceof Evaluate)) return undefined;
    const index = list.values.indexOf(output);
    if (index < 0) return undefined;
    return { kind: 'list', list, index: index + 1, container };
}

/** Whether the given container's content list will accept this kind. */
function listAccepts(
    project: Project,
    container: Evaluate,
    kind: InsertKind,
): boolean {
    const output = project.shares.output;
    const context = project.getNodeContext(container);
    // A Stage takes everything the toolbar can make.
    if (container.is(output.Stage, context)) return true;
    // A Group's content excludes Shape, so the three form kinds can't go there.
    if (container.is(output.Group, context)) return !isFormKind(kind);
    return false;
}

/**
 * Where a new output should sit, given the boxes of what's already in its
 * container — or undefined when there is nothing there, in which case the new
 * output gets no place at all and the stage centres it, exactly as the first
 * thing you add always did.
 *
 * The point returned is where the new output's own anchor goes: a Phrase's
 * `place` (its bottom-left) or a Shape's form anchor (its top-left), which is
 * the same anchor `movedOutput` moves. So a Shape lands a clean `InsertGap`
 * below what's there, while a Phrase's box reaches back up into the gap by its
 * own height — which is why the gap is a whole metre rather than a token one.
 *
 * There is no way to do better than that here. A Phrase's height comes from
 * measuring text in a canvas, so it isn't knowable until the phrase has been
 * laid out, and this runs while building the node that would be. A metre clears
 * the default-size `Phrase('hello')` this toolbar creates; a creator who then
 * makes it much bigger can drag it, which is what dragging is for.
 */
export function placeBelow(
    boxes: ContentBox[],
): { x: number; y: number } | undefined {
    if (boxes.length === 0) return undefined;
    const left = Math.min(...boxes.map((box) => box.x));
    const bottom = Math.min(...boxes.map((box) => box.y));
    return { x: left, y: bottom - InsertGap };
}

/**
 * The boxes of whatever already sits directly inside the given container, read
 * from the laid-out stage (#117's scene, which lays out on demand — the animator
 * is suspended while paused, and paused is the only state output is added in).
 *
 * `container` is the Evaluate that created the container, or undefined for the
 * stage itself, whose children are the entries with no parent above the stage.
 */
export function contentBoxes(
    scene: OutputInfoSet,
    container: Node | undefined,
): ContentBox[] {
    const boxes: ContentBox[] = [];
    for (const info of scene.values()) {
        const parent: Output | undefined = info.parents[0];
        if (parent === undefined) continue;
        const inside =
            container === undefined
                ? parent instanceof Stage
                : parent.value.creator === container;
        if (!inside) continue;
        // Something with no footprint (a Say, a Music) takes up no room, so it
        // can't be what a new output has to stay clear of.
        if (!info.output.occupiesSpace()) continue;
        boxes.push({
            x: info.local.x,
            y: info.local.y,
            width: info.width,
            height: info.height,
        });
    }
    return boxes;
}

/** A @Phrase's `place` input — the one `movedOutput` writes when a drag moves
 *  a phrase, so an added place and a dragged one are the same input. */
function PlaceInput(project: Project) {
    return project.shares.output.Phrase.inputs[3];
}

/** A `Place(x y 0m)` expression. */
function placeExpression(
    project: Project,
    locales: Locales,
    x: number,
    y: number,
): Evaluate {
    return Evaluate.make(
        project.shares.output.Place.getReference(locales),
        [x, y, 0].map((n) => NumberLiteral.make(round(n), Unit.meters())),
    );
}

/** Coordinates are written to two decimals everywhere else a place is (see
 *  OutputView's drag), so a generated one matches what a drag would produce. */
function round(n: number) {
    return Math.round(n * 100) / 100;
}

/** The Form evaluate a given form button makes, at the origin. */
function formFor(project: Project, locales: Locales, kind: FormKind): Evaluate {
    const output = project.shares.output;
    const m = (n: number) => NumberLiteral.make(n, Unit.meters());
    return kind === 'rectangle'
        ? Evaluate.make(output.Rectangle.getReference(locales), [
              m(-2),
              m(1),
              m(2),
              m(-1),
          ])
        : kind === 'circle'
          ? Evaluate.make(output.Circle.getReference(locales), [m(1)])
          : Evaluate.make(output.Polygon.getReference(locales), [
                m(1),
                NumberLiteral.make(5),
            ]);
}

/**
 * The new output itself, placed if it was given somewhere to be.
 *
 * A Shape has no `place` of its own — it is positioned by where its form's
 * coordinates are — so it is moved by translating the form, the same way
 * `movedOutput` moves one.
 */
function makeOutput(
    project: Project,
    locales: Locales,
    kind: InsertKind,
    place: { x: number; y: number } | undefined,
): Evaluate {
    const output = project.shares.output;

    if (isFormKind(kind)) {
        const form = formFor(project, locales, kind);
        const positioned =
            place === undefined
                ? form
                : (translateFormAt(project, form, place.x, place.y) ?? form);
        return Evaluate.make(output.Shape.getReference(locales), [positioned]);
    }

    if (kind === 'music')
        return Evaluate.make(output.Music.getReference(locales), [
            Evaluate.make(output.Track.getReference(locales), [
                ListLiteral.make(
                    [1, 2, 3, 4, 5].map((degree) => NumberLiteral.make(degree)),
                ),
            ]),
        ]);

    if (kind === 'say')
        return Evaluate.make(output.Say.getReference(locales), [
            TextLiteral.make(
                locales.getUnannotatedPrimaryText((l) => l.ui.phrases.welcome),
            ),
        ]);

    const phrase = createPlaceholderPhrase(project, locales);
    return place === undefined
        ? phrase
        : Evaluate.make(phrase.fun, [
              ...phrase.inputs,
              Input.make(
                  // The name of the PLACE INPUT, not of the Place type — using
                  // the type's name (`📍`) writes an input the Phrase doesn't
                  // have, and every added phrase carried an "unknown input"
                  // conflict.
                  locales.getName(PlaceInput(project).names),
                  placeExpression(project, locales, place.x, place.y),
              ),
          ]);
}

/** Translate a freshly built form to the given anchor. The form isn't in the
 *  project yet, so it gets the context of the definition it references. */
function translateFormAt(
    project: Project,
    form: Evaluate,
    x: number,
    y: number,
): Evaluate | undefined {
    const context = project.getNodeContext(project.getMain().expression);
    const anchor = getFormAnchor(project, form, context);
    if (anchor === undefined) return undefined;
    return translateFormTo(project, form, context, x, y);
}

/** What a form button does when the program is already just that bare form:
 *  show it, rather than adding a second one beside something invisible. */
function wrapTarget(
    project: Project,
    kind: InsertKind,
): { expression: Expression; wrap: 'phrase' | 'shape' } | undefined {
    const { kind: outputKind, expression, isList } = classifyOutput(project);
    if (isList || expression === undefined) return undefined;

    if (kind === 'phrase' && (outputKind === 'text' || outputKind === 'value'))
        return { expression, wrap: 'phrase' };

    if (isFormKind(kind) && outputKind === 'form') {
        // Only the button whose form is actually there: wrapping a Rectangle
        // when you asked for a Circle would be a lie about what you get.
        const context = project.getNodeContext(expression);
        if (
            expression instanceof Evaluate &&
            expression.is(definitionFor(project, kind), context)
        )
            return { expression, wrap: 'shape' };
    }

    return undefined;
}

/**
 * Which buttons will wrap what's already there rather than add something new —
 * which is what their tips say, so a creator knows before pressing.
 *
 * All of them at once rather than one at a time: each answer costs a
 * `classifyOutput`, which infers the program's output type, and the toolbar
 * needs every answer on every render.
 */
export function wrappingKinds(project: Project): Set<InsertKind> {
    const wrapping = new Set<InsertKind>();
    const { kind: outputKind, expression, isList } = classifyOutput(project);
    if (isList || expression === undefined) return wrapping;

    if (outputKind === 'text' || outputKind === 'value') wrapping.add('phrase');
    else if (outputKind === 'form' && expression instanceof Evaluate) {
        const context = project.getNodeContext(expression);
        for (const kind of FormKinds)
            if (expression.is(definitionFor(project, kind), context))
                wrapping.add(kind);
    }
    return wrapping;
}

/** The Form definition a form button corresponds to. */
function definitionFor(project: Project, kind: FormKind): StructureDefinition {
    return kind === 'rectangle'
        ? project.shares.output.Rectangle
        : kind === 'circle'
          ? project.shares.output.Circle
          : project.shares.output.Polygon;
}

/**
 * Lay out what the insertion changed, and nothing else.
 *
 * Every revision re-spaces the node it replaced, and adding a top-level output
 * replaces the program's *whole block* — so adding one phrase re-formatted every
 * other statement in the program, blowing a hand-written
 * `Group(Stack() [ … ])` across six lines the creator never asked for.
 *
 * Tokens survive a revision by identity, so every token that was already there
 * gets its own space back first, and then just `root` is laid out. `root` is the
 * *container* that changed — the content list an output joined, so that list
 * breaks across lines as it fills up — except when appending to the program's
 * block, where the container is the whole program and only the added statement
 * is new.
 *
 * Restoring is by token identity rather than by `Spaces.hasSpace`, which is a
 * sparse map: a token with no space before it simply isn't in it, so asking
 * `hasSpace` skips exactly the tokens a re-layout is most likely to push onto a
 * line of their own.
 */
function formatChanged(before: Project, after: Project, root: Node): Project {
    const source = after.getSourceOf(root);
    if (source === undefined) return after;
    const priorSource = before.getSources()[after.getSources().indexOf(source)];
    if (priorSource === undefined) return after;

    const prior = priorSource.getSpaces();
    const existed = new Set<Token>(
        priorSource
            .leaves()
            .filter((leaf): leaf is Token => leaf instanceof Token),
    );

    let spaces = source.getSpaces();
    for (const leaf of source.leaves())
        if (leaf instanceof Token && existed.has(leaf))
            spaces = spaces.withSpace(leaf, prior.getSpace(leaf));

    return after.withSource(
        source,
        source.withSpaces(getPreferredSpaces(root, spaces)),
    );
}

/** The result of an insert: the revised project, and the node it added, so the
 *  caller can select it and put the caret on it. */
export type Insertion = { project: Project; node: Evaluate };

/**
 * Add (or wrap into) an output of the given kind, and return the revision.
 *
 * Does NOT commit — the caller does, because it must also move the caret onto
 * the new node in the same revision. `withRevisedNodes` puts the caret on
 * whatever node it replaced (a whole content list, or the program block), and
 * the palette re-derives its selection from the caret, so committing without
 * moving the caret first silently throws the new selection away.
 */
export function insertOutput(
    project: Project,
    locales: Locales,
    kind: InsertKind,
    selected: Evaluate[],
    /** The laid-out stage, when there is one to read. Without it a new output
     *  goes wherever the container's own default is, which is the stage centre
     *  — the same place the first thing you add always goes. */
    scene: OutputInfoSet | undefined,
): Insertion | undefined {
    const wrap = wrapTarget(project, kind);
    if (wrap !== undefined) {
        const node =
            wrap.wrap === 'phrase'
                ? Evaluate.make(
                      project.shares.output.Phrase.getReference(locales),
                      [asText(project, wrap.expression)],
                  )
                : Evaluate.make(
                      project.shares.output.Shape.getReference(locales),
                      [wrap.expression],
                  );
        const revised = project.withRevisedNodes([[wrap.expression, node]]);
        return { project: formatChanged(project, revised, node), node };
    }

    const point = insertionPoint(project, selected, kind);
    const container =
        point.kind === 'list'
            ? point.container
            : (getStage(project) ?? undefined);
    const place =
        scene === undefined
            ? undefined
            : placeBelow(contentBoxes(scene, container));
    const node = makeOutput(project, locales, kind, place);

    // The container that changed is what gets laid out, so a content list breaks
    // across lines as it fills up. The program's block is the exception: it is
    // the whole program, so only the added statement is new there.
    if (point.kind === 'block') {
        const revised = project.withRevisedNodes([
            [point.block, point.block.withStatement(node)],
        ]);
        return { project: formatChanged(project, revised, node), node };
    }

    const list = ListLiteral.make([
        ...point.list.values.slice(0, point.index),
        node,
        ...point.list.values.slice(point.index),
    ]);
    const revised = project.withRevisedNodes([[point.list, list]]);
    return { project: formatChanged(project, revised, list), node };
}

/** An expression as something a @Phrase will take: text as itself, anything
 *  else shown as text through a conversion. */
function asText(project: Project, expression: Expression): Expression {
    const { kind } = classifyOutput(project);
    return kind === 'text'
        ? expression
        : Convert.make(expression, TextType.make());
}

/**
 * Commit an insertion: revise the project with the caret on the new node, so
 * that the palette's caret-driven selection agrees with the selection the
 * caller is about to make, rather than replacing it.
 */
export function commitInsertion(_db: Database, insertion: Insertion): Project {
    const source = insertion.project.getSourceOf(insertion.node);
    const revised =
        source === undefined
            ? insertion.project
            : insertion.project.withCaret(source, insertion.node);
    Projects.reviseProject(revised);
    return revised;
}

/**
 * Remove the given outputs from the program.
 *
 * Only output that sits directly in a content list or is one of the program's
 * own statements can go: those are the two places where taking something out
 * leaves the program still meaning something. Anything else — a @Form inside
 * the @Shape that needs one, say — is left alone rather than replaced with a
 * hole, and `removed` reports what actually went so the caller can say so.
 */
export function removeOutput(
    project: Project,
    outputs: Evaluate[],
): { project: Project; removed: Evaluate[] } | undefined {
    const removable = outputs.filter(
        (output) => containerOf(project, output) !== undefined,
    );
    if (removable.length === 0) return undefined;

    // What each removed output was standing in front of, and the space it stood
    // in. Gathered before the revision, while those tokens are still reachable.
    const source = project.getSourceOf(removable[0]);
    const vacated: { next: Token; space: string }[] = [];
    if (source !== undefined) {
        const spaces = source.getSpaces();
        const removed = new Set<Token>(
            removable.flatMap((output) =>
                output.leaves().filter((l): l is Token => l instanceof Token),
            ),
        );
        const leaving = new Set<Node>(removable);
        for (const output of removable) {
            const first = output.getFirstLeaf();
            const last = output.leaves().at(-1);
            if (first === undefined || !(last instanceof Token)) continue;
            // The next token that isn't itself on its way out.
            let next = source.getNextToken(last, 1);
            while (next !== undefined && removed.has(next))
                next = source.getNextToken(next, 1);
            if (next === undefined) continue;
            // A following sibling steps into the space this output was standing
            // in. Nothing following it means this was the last thing in its
            // container, and the space goes with it rather than onto the
            // closing bracket — or onto the end of the program, which is where
            // deleting a program's last statement left a stray blank line.
            const sibling = followingSibling(project, output, leaving);
            vacated.push({
                next,
                space:
                    sibling !== undefined
                        ? spaces.getSpace(first)
                        : spaces.getSpace(next),
            });
        }
    }

    const revised = project.withRevisedNodes(
        removable.map((output) => [output, undefined]),
    );

    // Whatever followed a removed output takes the space it was standing in,
    // rather than keeping its own on top of it. Removing a node hands its space
    // to the next token by CONCATENATION, which is right in the editor (delete a
    // word and the space after it stays) and wrong for taking a whole thing out
    // of a list, where it leaves the gap the thing used to fill: `[a b]` without
    // `a` came back as `[ b]`.
    const revisedSource =
        source === undefined
            ? undefined
            : revised.getSources()[project.getSources().indexOf(source)];
    if (revisedSource === undefined || vacated.length === 0)
        return { project: revised, removed: removable };

    let spaces = revisedSource.getSpaces();
    for (const { next, space } of vacated)
        spaces = spaces.withSpace(next, space);

    return {
        project: revised.withSource(
            revisedSource,
            revisedSource.withSpaces(spaces),
        ),
        removed: removable,
    };
}

/** The next thing in an output's container that isn't also on its way out. */
function followingSibling(
    project: Project,
    output: Evaluate,
    leaving: Set<Node>,
): Node | undefined {
    const container = containerOf(project, output);
    if (container === undefined) return undefined;
    const siblings: Node[] =
        container instanceof ListLiteral
            ? container.values
            : container.statements;
    return siblings
        .slice(siblings.indexOf(output) + 1)
        .find((sibling) => !leaving.has(sibling));
}

/**
 * Whether the selection can be collected into a @Group (#119).
 *
 * Two constraints, both from the language rather than from taste. The outputs
 * have to share a container, since a Group replaces a run of siblings and there
 * is no sensible code to generate for two things in different lists. And
 * `Group.content` is `[Phrase|Group|Say|Music|ø]`, so a Shape or a Stage in the
 * selection makes it impossible — that is the one place a toolbar button is
 * legitimately inactive, and its tip says which of the two it is.
 */
export type GroupProblem = 'empty' | 'scattered' | 'kind';

export function groupProblem(
    project: Project,
    selected: Evaluate[],
): GroupProblem | undefined {
    if (selected.length === 0) return 'empty';

    const output = project.shares.output;
    for (const node of selected) {
        const context = project.getNodeContext(node);
        if (
            !node.isOneOf(
                context,
                output.Phrase,
                output.Group,
                output.Say,
                output.Music,
            )
        )
            return 'kind';
    }

    const containers = new Set(
        selected.map((node) => containerOf(project, node)),
    );
    if (containers.size !== 1 || containers.has(undefined)) return 'scattered';

    return undefined;
}

/** The list or block a selected output sits directly in — what a Group would
 *  take its place within. */
function containerOf(
    project: Project,
    node: Evaluate,
): ListLiteral | Block | undefined {
    const ancestors = project.getRoot(node)?.getAncestors(node);
    const parent = ancestors?.[0];
    if (parent instanceof ListLiteral) return parent;
    if (parent instanceof Block) return parent;
    return undefined;
}

/**
 * Collect the selection into a @Group with a stacked layout, in place.
 *
 * The Group takes the position of the first selected output, and the rest are
 * removed from where they were — so a run in the middle of a list stays in the
 * middle, and a run of the program's own result expressions keeps the binds
 * around it where they were.
 */
export function groupSelection(
    project: Project,
    locales: Locales,
    selected: Evaluate[],
): Insertion | undefined {
    if (groupProblem(project, selected) !== undefined) return undefined;

    const container = containerOf(project, selected[0]);
    if (container === undefined) return undefined;

    const chosen = new Set<Node>(selected);
    const values: (Expression | Spread)[] =
        container instanceof ListLiteral
            ? container.values
            : container.statements;
    // In the order they appear, not the order they were clicked: the group's
    // layout follows the program, which is what the creator can see.
    const ordered = values.filter((value): value is Evaluate =>
        chosen.has(value),
    );
    if (ordered.length !== selected.length) return undefined;

    const group = Evaluate.make(
        project.shares.output.Group.getReference(locales),
        [
            Evaluate.make(
                project.shares.output.Stack.getReference(locales),
                [],
            ),
            ListLiteral.make([...ordered]),
        ],
    );

    let placed = false;
    const replacement: (Expression | Spread)[] = [];
    for (const value of values) {
        if (chosen.has(value)) {
            if (!placed) {
                replacement.push(group);
                placed = true;
            }
        } else replacement.push(value);
    }

    const revised = project.withRevisedNodes([
        [
            container,
            container instanceof ListLiteral
                ? ListLiteral.make(replacement)
                : container.replace(
                      container.statements,
                      replacement.filter(
                          (node): node is Expression =>
                              !(node instanceof Spread),
                      ),
                  ),
        ],
    ]);

    return { project: formatChanged(project, revised, group), node: group };
}
