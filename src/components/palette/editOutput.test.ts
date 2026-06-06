import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import Convert from '@nodes/Convert';
import { DB } from '@db/Database';
import {
    addGroup,
    addShape,
    addSoloPhrase,
    addStage,
    classifyOutput,
    offersFor,
    type OutputKind,
} from '@components/palette/editOutput';

/** Build a project from a program string. */
function make(code: string) {
    const source = new Source('test', code);
    return Project.make(null, 'test', source, [], DefaultLocale);
}

function kindOf(code: string): OutputKind {
    return classifyOutput(make(code)).kind;
}

/** Whether a revised project contains a node the predicate matches. */
function has(
    project: Project,
    is: (e: Evaluate, project: Project) => boolean,
): boolean {
    return project
        .getMain()
        .expression.nodes()
        .some((n) => n instanceof Evaluate && is(n, project));
}

const isPhrase = (e: Evaluate, p: Project) =>
    e.is(p.shares.output.Phrase, p.getContext(p.getMain()));
const isShape = (e: Evaluate, p: Project) =>
    e.is(p.shares.output.Shape, p.getContext(p.getMain()));

// --- classifyOutput: one per kind -------------------------------------------

test('classifyOutput: empty program is none', () => {
    expect(kindOf('')).toBe('none');
});

test('classifyOutput: text literal is text', () => {
    expect(kindOf(`'hi'`)).toBe('text');
});

test('classifyOutput: a plain value is value', () => {
    expect(kindOf('1 + 1')).toBe('value');
});

test('classifyOutput: a bare Form is form', () => {
    expect(kindOf('Rectangle(1m 2m 3m 4m)')).toBe('form');
    expect(kindOf('Circle(2m)')).toBe('form');
    expect(kindOf('Polygon(4m 5)')).toBe('form');
});

test('classifyOutput: output Evaluates classify by type', () => {
    expect(kindOf(`Phrase('a')`)).toBe('phrase');
    expect(kindOf(`Group(Stack() [Phrase('a')])`)).toBe('group');
    expect(kindOf('Shape(Rectangle(1m 2m 3m 4m))')).toBe('shape');
    expect(kindOf(`Stage([Phrase('a')])`)).toBe('stage');
});

test('classifyOutput: a reference that evaluates to an output is that output, not value', () => {
    // The bug guard: an indirectly-produced Shape must NOT be treated as a text-convertible value.
    expect(kindOf('s: Shape(Rectangle(0m 0m 1m 1m))\ns')).toBe('shape');
    expect(kindOf(`p: Phrase('a')\np`)).toBe('phrase');
    expect(kindOf(`g: Group(Stack() [Phrase('a')])\ng`)).toBe('group');
});

test('classifyOutput: an optional (Group|ø) output is a group, never a text-convertible value', () => {
    // List access yields `Group|ø`; this previously leaked to `value` and offered converting the
    // group to text — "that's just weird". It must classify as a group (no phrase offer).
    const code = `[Group(Stack() [Phrase('a')])][2]`;
    expect(kindOf(code)).toBe('group');
    expect(offersFor(kindOf(code), false)).not.toContain('phrase');
});

// --- offersFor: the type-correct transformation matrix ----------------------

test('offersFor: matrix (no stage yet)', () => {
    // No output: only a distinct "add a placeholder Phrase" offer — no wrap/create actions.
    expect(offersFor('none', false)).toEqual(['placeholder']);
    expect(offersFor('text', false)).toEqual(['phrase']);
    expect(offersFor('value', false)).toEqual(['phrase']);
    expect(offersFor('form', false)).toEqual(['shape']);
    expect(offersFor('phrase', false)).toEqual(['group', 'stage']);
    expect(offersFor('group', false)).toEqual(['stage']);
    // A Shape can be wrapped in a Stage but NOT a Group.
    expect(offersFor('shape', false)).toEqual(['stage']);
    expect(offersFor('say', false)).toEqual(['group', 'stage']);
    expect(offersFor('stage', false)).toEqual([]);
});

test('offersFor: an existing Stage suppresses Group/Stage wraps', () => {
    expect(offersFor('phrase', true)).toEqual([]);
    expect(offersFor('shape', true)).toEqual([]);
    // An empty program still offers the placeholder Phrase; a bare Form still offers Shape.
    expect(offersFor('none', true)).toEqual(['placeholder']);
    expect(offersFor('form', true)).toEqual(['shape']);
});

// --- the transforms produce type-correct structure --------------------------

test('addSoloPhrase: does NOT wrap a Shape (the reported bug)', () => {
    // No phrase offer for a shape; addSoloPhrase is a no-op and produces no Convert.
    expect(
        addSoloPhrase(DB, make('Shape(Rectangle(1m 2m 3m 4m))')),
    ).toBeUndefined();
});

test('addSoloPhrase: a value becomes a Phrase showing it as text (Convert)', () => {
    const revised = addSoloPhrase(DB, make('1 + 1'));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('phrase');
    // The value is displayed as text via a Convert.
    expect(
        revised!
            .getMain()
            .expression.nodes()
            .some((n) => n instanceof Convert),
    ).toBe(true);
});

test('addSoloPhrase: text becomes a Phrase WITHOUT a Convert', () => {
    const revised = addSoloPhrase(DB, make(`'hi'`));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('phrase');
    expect(
        revised!
            .getMain()
            .expression.nodes()
            .some((n) => n instanceof Convert),
    ).toBe(false);
});

test('addShape: wraps a bare Form in a Shape', () => {
    const revised = addShape(DB, make('Rectangle(1m 2m 3m 4m)'));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('shape');
});

test('addGroup: wraps a Phrase in a Group', () => {
    const revised = addGroup(DB, make(`Phrase('a')`));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('group');
    expect(has(revised!, isPhrase)).toBe(true);
});

test('addStage: wraps the actual Phrase output', () => {
    const revised = addStage(DB, make(`Phrase('a')`));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('stage');
    expect(has(revised!, isPhrase)).toBe(true);
});

test('addStage: wraps the actual Shape output (not a placeholder phrase)', () => {
    const revised = addStage(DB, make('Shape(Rectangle(1m 2m 3m 4m))'));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('stage');
    // The real Shape is inside the Stage — it wasn't dropped for a placeholder.
    expect(has(revised!, isShape)).toBe(true);
});

test('addStage: bails when a Stage already exists', () => {
    expect(addStage(DB, make(`Stage([Phrase('a')])`))).toBeUndefined();
});
