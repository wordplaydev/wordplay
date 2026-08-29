import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Project from '@db/projects/Project';
import { getFormAnchor } from '@edit/output/editShape';
import Evaluate from '@nodes/Evaluate';
import ListLiteral from '@nodes/ListLiteral';
import Source from '@nodes/Source';
import { DB } from '@db/Database';
import { getStage } from '@components/palette/editOutput';
import readMusic, { musicsIn } from '@edit/output/editableMusic';
import Convert from '@nodes/Convert';
import RenderContext from '@output/RenderContext';
import { toStage } from '@output/Output/Stage';
import type { OutputInfoSet } from '@output/animation/Animator';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';
import {
    InsertGap,
    contentBoxes,
    ensureStage,
    groupProblem,
    groupSelection,
    insertOutput,
    insertionPoint,
    placeBelow,
    removeOutput,
    wrappingKinds,
    type InsertKind,
} from '@components/palette/insertOutput';

function make(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    return project;
}

/** The Evaluates in a project's main source, in source order. */
function evaluates(project: Project): Evaluate[] {
    return project
        .getMain()
        .expression.nodes()
        .filter((n): n is Evaluate => n instanceof Evaluate);
}

/** The Evaluates that are the given output type. */
function ofType(
    project: Project,
    name: 'Phrase' | 'Group' | 'Shape' | 'Stage',
) {
    const context = project.getContext(project.getMain());
    return evaluates(project).filter((e) =>
        e.is(project.shares.output[name], context),
    );
}

/** Add something with no scene, so nothing is placed. */
function add(project: Project, kind: InsertKind, selected: Evaluate[] = []) {
    const result = insertOutput(
        project,
        DefaultLocales,
        kind,
        selected,
        undefined,
    );
    if (result === undefined) throw new Error('expected an insertion');
    return result;
}

// --- where new content goes -------------------------------------------------

test('with nothing selected and no stage, content becomes a new statement', () => {
    const project = make(`Phrase('a')`);
    const point = insertionPoint(project, [], 'phrase');
    expect(point.kind).toBe('block');
});

test('with nothing selected and a stage, content joins the stage', () => {
    const project = make(`Stage([Phrase('a')])`);
    const point = insertionPoint(project, [], 'phrase');
    expect(point.kind).toBe('list');
    if (point.kind !== 'list') return;
    expect(
        point.container.is(
            project.shares.output.Stage,
            project.getContext(project.getMain()),
        ),
    ).toBe(true);
    // At the end of what's already there.
    expect(point.index).toBe(1);
});

test('with a selection, content goes into its container just after it', () => {
    const project = make(`Group(Row() [Phrase('a') Phrase('b')])`);
    const phrases = ofType(project, 'Phrase');
    const point = insertionPoint(project, [phrases[0]], 'phrase');
    expect(point.kind).toBe('list');
    if (point.kind !== 'list') return;
    // Just after the first phrase, not at the end.
    expect(point.index).toBe(1);
    expect(
        point.container.is(
            project.shares.output.Group,
            project.getContext(project.getMain()),
        ),
    ).toBe(true);
});

test('a Shape never lands in a Group, whose content type excludes it', () => {
    // Group.content is [Phrase|Group|Say|Music|ø]. Falling through to the block
    // is what keeps the form buttons from ever being inactive: adding is always
    // legal somewhere.
    const project = make(`Group(Row() [Phrase('a')])`);
    const phrases = ofType(project, 'Phrase');
    expect(insertionPoint(project, [phrases[0]], 'circle').kind).toBe('block');
    // But a phrase does go in.
    expect(insertionPoint(project, [phrases[0]], 'phrase').kind).toBe('list');
});

// --- what gets added --------------------------------------------------------

test('adding a phrase twice makes two phrases, not one replacing the other', () => {
    // The old offers transformed the program, so "add" meant "wrap" and a
    // second press had nothing left to do.
    let project = make(`Phrase('a')`);
    project = add(project, 'phrase').project;
    project = add(project, 'phrase').project;
    expect(ofType(project, 'Phrase')).toHaveLength(3);
});

test.each([
    ['rectangle', 'Rectangle'],
    ['circle', 'Circle'],
    ['polygon', 'Polygon'],
] as const)('the %s button makes a Shape of that form', (kind, form) => {
    const project = add(make(`Phrase('a')`), kind).project;
    const context = project.getContext(project.getMain());
    const shapes = ofType(project, 'Shape');
    expect(shapes).toHaveLength(1);
    const inner = shapes[0].inputs[0];
    expect(
        inner instanceof Evaluate &&
            inner.is(project.shares.output[form], context),
    ).toBe(true);
});

test('adding music and speech works with nothing on stage', () => {
    const withMusic = add(make(''), 'music').project;
    expect(withMusic.getMain().expression.toWordplay()).toContain('🎼');
    const withSay = add(make(''), 'say').project;
    expect(withSay.getMain().expression.toWordplay()).toContain('🔊');
});

test('added content joins a stage rather than sitting beside it', () => {
    const project = add(make(`Stage([Phrase('a')])`), 'phrase').project;
    const stages = ofType(project, 'Stage');
    expect(stages).toHaveLength(1);
    const content = stages[0].inputs[0];
    expect(content instanceof ListLiteral ? content.values.length : 0).toBe(2);
});

// --- wrapping ---------------------------------------------------------------

test('the phrase button wraps a program that is only text', () => {
    const project = make(`'hello'`);
    expect(wrappingKinds(project).has('phrase')).toBe(true);
    const after = add(project, 'phrase').project;
    expect(ofType(after, 'Phrase')).toHaveLength(1);
    expect(after.getMain().expression.toWordplay()).toContain(`'hello'`);
});

test('the phrase button adds rather than wraps once there is output', () => {
    expect(wrappingKinds(make(`Phrase('a')`)).has('phrase')).toBe(false);
});

test('only the matching form button wraps a bare form', () => {
    // Wrapping a Rectangle when the creator pressed "circle" would be a lie
    // about what they get.
    const project = make(`Rectangle(-1m 1m 1m -1m)`);
    expect(wrappingKinds(project).has('rectangle')).toBe(true);
    expect(wrappingKinds(project).has('circle')).toBe(false);
    expect(wrappingKinds(project).has('polygon')).toBe(false);

    const wrapped = add(project, 'rectangle').project;
    expect(ofType(wrapped, 'Shape')).toHaveLength(1);
    // The creator's own rectangle, not a fresh one.
    expect(wrapped.getMain().expression.toWordplay()).toContain('-1m');

    // The circle button adds a second, separate shape instead.
    const added = add(project, 'circle').project;
    expect(ofType(added, 'Shape')).toHaveLength(1);
    expect(added.getMain().expression.toWordplay()).toContain('-1m');
});

// --- placement --------------------------------------------------------------

test('nothing there yet means no place at all, so the stage centres it', () => {
    expect(placeBelow([])).toBeUndefined();
});

test('something there means below its lowest, leftmost point', () => {
    expect(
        placeBelow([
            { x: -2, y: 1, width: 3, height: 1 },
            { x: 1, y: -0.5, width: 2, height: 1 },
        ]),
    ).toEqual({ x: -2, y: -0.5 - InsertGap });
});

/**
 * A scene built from a real stage, the way Animator.layout would: each of the
 * stage's shapes as a direct stage child. Shapes rather than phrases because
 * Shape.getLayout is pure geometry, while a Phrase needs a DOM to measure.
 */
function sceneOf(project: Project): OutputInfoSet {
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    const context = new RenderContext(
        'Noto Sans',
        12,
        DefaultLocales,
        new Set(),
        1,
        'horizontal-tb',
    );
    const scene: OutputInfoSet = new Map();
    for (const [child, place] of stage.getLayout(context).places) {
        const layout = child.getLayout(context);
        scene.set(child.getName(), {
            output: child,
            global: place,
            local: place,
            rotation: undefined,
            width: layout.width,
            height: layout.height,
            parents: [stage],
            context,
        });
    }
    return scene;
}

test('the stage lays out what a new output has to stay clear of', () => {
    const project = make(`Shape(Rectangle(-2m 3m 2m 1m))
Shape(Circle(1m 0m 0m))`);
    const boxes = contentBoxes(sceneOf(project), undefined);
    expect(boxes).toHaveLength(2);
    // The rectangle spans x −2…2 and y 1…3; the circle x −1…1 and y −1…1.
    expect(Math.min(...boxes.map((b) => b.x))).toBeCloseTo(-2);
    expect(Math.min(...boxes.map((b) => b.y))).toBeCloseTo(-1);
});

test('something with no footprint is not something to stay clear of', () => {
    // A Say is heard, not seen, so it can't push a new output down.
    const project = make(`Shape(Rectangle(-2m 3m 2m 1m))
Say('hi')`);
    expect(contentBoxes(sceneOf(project), undefined)).toHaveLength(1);
});

test('a new shape lands below what the stage already holds', () => {
    const project = make(`Shape(Rectangle(-2m 3m 2m 1m))`);
    const result = insertOutput(
        project,
        DefaultLocales,
        'circle',
        [],
        sceneOf(project),
    );
    if (result === undefined) throw new Error('expected an insertion');
    // A Shape is positioned by its form, whose anchor is its top-left — so the
    // new circle's TOP sits a gap below the rectangle's bottom (1m), clear of it.
    const form = result.node.inputs[0];
    expect(form).toBeInstanceOf(Evaluate);
    if (!(form instanceof Evaluate)) return;
    const revised = result.project;
    revised.analyze();
    const anchor = getFormAnchor(
        revised,
        form,
        revised.getNodeContext(revised.getMain().expression),
    );
    expect(anchor).toEqual({ x: -2, y: 1 - InsertGap });
});

test('a new phrase gets a place only when there is something to clear', () => {
    const empty = add(make(''), 'phrase');
    expect(empty.node.toWordplay()).not.toContain('📍');

    const project = make(`Shape(Rectangle(-2m 3m 2m 1m))`);
    const beside = insertOutput(
        project,
        DefaultLocales,
        'phrase',
        [],
        sceneOf(project),
    );
    if (beside === undefined) throw new Error('expected an insertion');
    expect(beside.node.toWordplay()).toContain('📍');
});

// --- grouping the selection (#119) ------------------------------------------

test('nothing selected means nothing to group', () => {
    expect(groupProblem(make(`Phrase('a')`), [])).toBe('empty');
});

test('a selection spanning two containers cannot be grouped', () => {
    const project = make(`Group(Row() [Phrase('a')])
Phrase('b')`);
    const phrases = ofType(project, 'Phrase');
    expect(groupProblem(project, phrases)).toBe('scattered');
});

test('a Shape cannot be grouped, since Group content excludes it', () => {
    const project = make(`Phrase('a')
Shape(Circle(1m))`);
    const context = project.getContext(project.getMain());
    const selected = evaluates(project).filter(
        (e) =>
            e.is(project.shares.output.Phrase, context) ||
            e.is(project.shares.output.Shape, context),
    );
    expect(groupProblem(project, selected)).toBe('kind');
});

test('one output can be grouped on its own', () => {
    const project = make(`Phrase('a')`);
    expect(groupProblem(project, ofType(project, 'Phrase'))).toBeUndefined();
});

test('a run of top-level phrases becomes one Group where the first was', () => {
    const project = make(`greeting: 'hi'
Phrase(greeting)
Phrase('b')`);
    const result = groupSelection(
        project,
        DefaultLocales,
        ofType(project, 'Phrase'),
    );
    if (result === undefined) throw new Error('expected a group');
    const statements =
        result.project.getMain().expression.expression.statements;
    // The bind stays where it was, and one Group replaces the two phrases.
    expect(statements).toHaveLength(2);
    expect(statements[1]).toBe(result.node);
    expect(ofType(result.project, 'Group')).toHaveLength(1);
    expect(ofType(result.project, 'Phrase')).toHaveLength(2);
});

test('a run inside a list stays where it was in the list', () => {
    const project = make(
        `Stage([Phrase('a') Phrase('b') Phrase('c') Phrase('d')])`,
    );
    const phrases = ofType(project, 'Phrase');
    const result = groupSelection(project, DefaultLocales, [
        phrases[1],
        phrases[2],
    ]);
    if (result === undefined) throw new Error('expected a group');
    const stage = ofType(result.project, 'Stage')[0];
    const content = stage.inputs[0];
    expect(content).toBeInstanceOf(ListLiteral);
    if (!(content instanceof ListLiteral)) return;
    // a, the new group, d.
    expect(content.values).toHaveLength(3);
    expect(content.values[1]).toBe(result.node);
});

test('grouping follows source order, not the order things were clicked', () => {
    const project = make(`Stage([Phrase('a') Phrase('b')])`);
    const phrases = ofType(project, 'Phrase');
    const result = groupSelection(project, DefaultLocales, [
        phrases[1],
        phrases[0],
    ]);
    if (result === undefined) throw new Error('expected a group');
    const content = result.node.inputs[1];
    expect(content).toBeInstanceOf(ListLiteral);
    if (!(content instanceof ListLiteral)) return;
    expect(content.values.map((v) => v.toWordplay())).toEqual([
        phrases[0].toWordplay(),
        phrases[1].toWordplay(),
    ]);
});

// --- what the old whole-program offers used to cover -------------------------

test('a value becomes a Phrase showing it as text', () => {
    const project = add(make('1 + 1'), 'phrase').project;
    expect(
        project
            .getMain()
            .expression.nodes()
            .some((n) => n instanceof Convert),
    ).toBe(true);
});

test('text becomes a Phrase without a conversion', () => {
    const project = add(make(`'hi'`), 'phrase').project;
    expect(
        project
            .getMain()
            .expression.nodes()
            .some((n) => n instanceof Convert),
    ).toBe(false);
});

test('a Shape is never wrapped in a Phrase', () => {
    // The reported bug: output is not a value to show as text.
    const project = make('Shape(Rectangle(1m 2m 3m 4m))');
    expect(wrappingKinds(project).has('phrase')).toBe(false);
    const after = add(project, 'phrase').project;
    // A second, separate phrase, with the shape untouched.
    expect(ofType(after, 'Shape')).toHaveLength(1);
    expect(ofType(after, 'Phrase')).toHaveLength(1);
});

test('added music is seeded with notes to hear and to edit', () => {
    const project = add(make(''), 'music').project;
    const musics = musicsIn(project);
    expect(musics).toHaveLength(1);
    const read = readMusic(project, musics[0]);
    expect(read?.tracks).toHaveLength(1);
    expect(read?.tracks[0].data.notes.map((n) => n.degrees)).toEqual([
        [1],
        [2],
        [3],
        [4],
        [5],
    ]);
});

test('music joins a stage rather than competing with it', () => {
    const project = add(make(`Stage([Phrase('hi')])`), 'music').project;
    expect(musicsIn(project)).toHaveLength(1);
    expect(project.getMain().toWordplay()).toContain('hi');
});

// --- what gets added must actually be valid code ----------------------------

test.each([
    ['phrase'],
    ['rectangle'],
    ['circle'],
    ['polygon'],
    ['music'],
    ['say'],
] as const)('adding a %s produces no conflicts', (kind) => {
    // Every added output is written by hand here, so nothing checks its shape
    // unless this does. Writing the Place TYPE's name (`📍`) where the place
    // INPUT's name belonged gave every added phrase an "unknown input" error.
    const project = make(`Shape(Rectangle(-2m 3m 2m 1m))`);
    const result = insertOutput(
        project,
        DefaultLocales,
        kind,
        [],
        sceneOf(project),
    );
    if (result === undefined) throw new Error('expected an insertion');
    const revised = result.project;
    revised.analyze();
    expect(
        (revised.getConflicts() ?? []).map(
            (conflict) => conflict.constructor.name,
        ),
    ).toEqual([]);
});

// --- laying out what changed ------------------------------------------------

/** Add a phrase to a program written a particular way, and read the code back. */
function addedTo(code: string): string {
    const project = make(code);
    const result = insertOutput(
        project,
        DefaultLocales,
        'phrase',
        [],
        undefined,
    );
    if (result === undefined) throw new Error('expected an insertion');
    return result.project.getMain().toWordplay();
}

test('a content list breaks across lines as it fills up', () => {
    // The list is what changed, so it is what gets laid out.
    expect(
        addedTo(
            `Stage([Phrase('aaaaaaaaaa') Phrase('bbbbbbbbbb') Phrase('cccccccccc') Phrase('dddddddddd')])`,
        ),
    ).toBe(
        `Stage([\n\tPhrase('aaaaaaaaaa')\n\tPhrase('bbbbbbbbbb')\n\tPhrase('cccccccccc')\n\tPhrase('dddddddddd')\n\t💬('hello')\n])`,
    );
});

test('a list already written across lines gains one more', () => {
    expect(addedTo(`Stage([\n\tPhrase('a')\n])`)).toBe(
        `Stage([\n\tPhrase('a')\n\t💬('hello')\n])`,
    );
});

test('a short list stays on its line', () => {
    expect(addedTo(`Stage([Phrase('a')])`)).toBe(
        `Stage([Phrase('a') 💬('hello')])`,
    );
});

test('nothing else in the program is re-formatted', () => {
    // Adding a top-level statement replaces the program's whole block, which
    // used to re-lay-out every other statement in it — a hand-written Group
    // came back across six lines.
    const written = `Group(Stack() [\n\tPhrase('a')\n\tPhrase('b')\n])`;
    expect(addedTo(written)).toBe(`${written}\n💬('hello')`);
});

test('grouping lays the new Group out and leaves its neighbours alone', () => {
    const project = make(`x: 1\nPhrase('a')\nPhrase('b')`);
    const result = groupSelection(
        project,
        DefaultLocales,
        ofType(project, 'Phrase'),
    );
    expect(result?.project.getMain().toWordplay()).toBe(
        `x: 1\n🔳(\n\t⬇()\n\t[\n\t\tPhrase('a')\n\t\tPhrase('b')\n\t]\n)`,
    );
});

// --- removing selected output ------------------------------------------------

test('removing one output takes it out of its list', () => {
    const project = make(`Stage([Phrase('a') Phrase('b')])`);
    const result = removeOutput(project, [ofType(project, 'Phrase')[0]]);
    expect(result?.project.getMain().toWordplay()).toBe(`Stage([Phrase('b')])`);
});

test('removing several at once takes all of them', () => {
    // Each replacement rebuilds the source, so a second node gathered up front
    // has to still be findable in the rebuilt one.
    const project = make(`Stage([Phrase('a') Phrase('b') Phrase('c')])`);
    const phrases = ofType(project, 'Phrase');
    const result = removeOutput(project, [phrases[0], phrases[2]]);
    expect(result?.project.getMain().toWordplay()).toBe(`Stage([Phrase('b')])`);
});

test('removing across two containers works', () => {
    const project = make(`Group(Row() [Phrase('a')])\nPhrase('b')`);
    const result = removeOutput(project, ofType(project, 'Phrase'));
    expect(result?.removed).toHaveLength(2);
    expect(ofType(result!.project, 'Phrase')).toHaveLength(0);
});

test('removing a top-level statement takes the statement', () => {
    const project = make(`x: 1\nPhrase('a')`);
    const result = removeOutput(project, ofType(project, 'Phrase'));
    expect(result?.project.getMain().toWordplay()).toBe(`x: 1`);
});

test('output that is not in a list or a statement is left alone', () => {
    // A Shape's Form is the one input it must have; taking it out would leave a
    // hole rather than a smaller program.
    const project = make(`Shape(Rectangle(-1m 1m 1m -1m))`);
    const context = project.getContext(project.getMain());
    const form = evaluates(project).find((e) =>
        e.is(project.shares.output.Rectangle, context),
    );
    expect(removeOutput(project, [form!])).toBeUndefined();
});

/**
 * Arming the pencil on a program that renders nothing gives it a canvas to draw on.
 *
 * Without one, `toStage` returns undefined, OutputView shows a value message rather than a
 * stage, and the stroke preview — which lives inside the root group — has nowhere to go, so the
 * pencil looked like it did nothing at all.
 */
test('an empty program gets a stage to draw on', () => {
    const project = make('');
    const revised = ensureStage(project, DefaultLocales);
    expect(revised).toBeDefined();
    const stage = revised && getStage(revised);
    expect(stage).toBeDefined();
    // Empty, not seeded with a placeholder phrase the creator would have to delete — which is
    // what addStage does, and why this isn't addStage.
    const context = revised!.getNodeContext(stage!);
    const content = stage!.getInput(
        revised!.shares.output.Stage.inputs[0],
        context,
    );
    expect(content).toBeInstanceOf(ListLiteral);
    expect((content as ListLiteral).values).toHaveLength(0);
});

test('a program that already renders something is left alone', () => {
    // Anything with output already has a stage — explicit or the default one toStage wraps a
    // lone output in — so there is nothing to add and nothing to say.
    for (const code of [
        `Phrase('hi')`,
        `Stage([])`,
        `Shape(Circle(1m))`,
        `Phrase('a')
Phrase('b')`,
    ])
        expect(ensureStage(make(code), DefaultLocales)).toBeUndefined();
});

test('the stage it adds is a program that works', () => {
    const revised = ensureStage(make(''), DefaultLocales);
    expect(revised).toBeDefined();
    revised?.analyze();
    expect(
        (revised?.getConflicts() ?? []).map((c) => c.constructor.name),
    ).toEqual([]);
});
