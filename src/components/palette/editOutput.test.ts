import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import Convert from '@nodes/Convert';
import { DB } from '@db/Database';
import readMusic, { musicsIn } from '@edit/output/editableMusic';
import {
    addGroup,
    addMusic,
    addShape,
    addSoloPhrase,
    addStage,
    classifyOutput,
    movedOutput,
    offersFor,
    type OutputKind,
} from '@components/palette/editOutput';
import DefaultLocales from '@locale/DefaultLocales';

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

/** How many nodes in a project match the predicate. */
function count(
    project: Project,
    is: (e: Evaluate, project: Project) => boolean,
): number {
    return project
        .getMain()
        .expression.nodes()
        .filter((n) => n instanceof Evaluate && is(n, project)).length;
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

test('classifyOutput: a list of outputs is classified by element kind and marked isList', () => {
    const c = classifyOutput(make(`[Phrase('a') Phrase('b')]`));
    expect(c.kind).toBe('phrase');
    expect(c.isList).toBe(true);
});

test('classifyOutput: a list containing a Shape is shape-kind (Stage-only, no Group)', () => {
    const c = classifyOutput(
        make(`[Phrase('a') Shape(Rectangle(1m 2m 3m 4m))]`),
    );
    expect(c.kind).toBe('shape');
    expect(c.isList).toBe(true);
    expect(offersFor(c.kind, false)).toEqual(['stage', 'music']);
});

test('addStage: wraps a WHOLE list of outputs as the stage content', () => {
    const revised = addStage(DB, make(`[Phrase('a') Phrase('b')]`));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('stage');
    // Both phrases are inside the new Stage — the whole list was wrapped, not just the last.
    expect(count(revised!, isPhrase)).toBe(2);
});

test('addGroup: wraps a WHOLE list of phrases as the group content', () => {
    const revised = addGroup(DB, make(`[Phrase('a') Phrase('b')]`));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('group');
    expect(count(revised!, isPhrase)).toBe(2);
});

test('classifyOutput: multiple top-level output statements are a list of outputs', () => {
    // A block with 2+ result statements evaluates to a list, so the output is all of them.
    const c = classifyOutput(make(`Phrase('a')\nPhrase('b')\nPhrase('c')`));
    expect(c.kind).toBe('phrase');
    expect(c.isList).toBe(true);
});

test('addGroup: wraps ALL top-level phrase statements into one Group', () => {
    const code = `Phrase('hi')\nPhrase('hi')\nPhrase('hi')\nPhrase('hi')`;
    const revised = addGroup(DB, make(code));
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('group');
    // All four phrases end up inside the single Group...
    expect(count(revised!, isPhrase)).toBe(4);
    // ...and the four statements became one result statement (the Group).
    expect(
        revised!.getMain().expression.expression.getResultStatements().length,
    ).toBe(1);
});

test('addStage: wraps ALL top-level output statements (mixed) into one Stage', () => {
    const revised = addStage(
        DB,
        make(`Phrase('a')\nShape(Rectangle(1m 2m 3m 4m))`),
    );
    expect(revised).toBeDefined();
    expect(classifyOutput(revised!).kind).toBe('stage');
    expect(count(revised!, isPhrase)).toBe(1);
    expect(count(revised!, isShape)).toBe(1);
    expect(
        revised!.getMain().expression.expression.getResultStatements().length,
    ).toBe(1);
});

test('a list with a Shape offers Stage but not Group (Shape cannot go in a Group)', () => {
    expect(
        offersFor(
            classifyOutput(make(`Phrase('a')\nShape(Rectangle(1m 2m 3m 4m))`))
                .kind,
            false,
        ),
    ).toEqual(['stage', 'music']);
});

test('classifyOutput: an optional (Group|ø) output is a group, never a text-convertible value', () => {
    // List access yields `Group|ø`; this previously leaked to `value` and offered converting the
    // group to text — "that's just weird". It must classify as a group (no phrase offer).
    const code = `[Group(Stack() [Phrase('a')])][2]`;
    expect(kindOf(code)).toBe('group');
    expect(offersFor(kindOf(code), false)).not.toContain('phrase');
});

test('classifyOutput: a Music is output, not a value to convert to text', () => {
    // Music is heard rather than seen, so nothing about it looked like output
    // to the classifier and it fell through to `value` — which is the kind that
    // offers "make a Phrase by converting this to text". A @Phrase wrapped
    // around a song is not a thing.
    expect(kindOf(`Music(Track([1 2 3]))`)).toBe('music');
    expect(offersFor(kindOf(`Music(Track([1 2 3]))`), false)).not.toContain(
        'phrase',
    );
});

test('classifyOutput: a Music reached through a name is still output', () => {
    // The same invariant the Group|ø case protects: a reference that evaluates
    // to output must classify as that output, not as a text-convertible value.
    const code = `song: Music(Track([1 2 3]))\nsong`;
    expect(kindOf(code)).toBe('music');
    expect(offersFor(kindOf(code), false)).not.toContain('phrase');
});

test('offersFor: a Phrase is offered for one statement, not for several', () => {
    // The rule: wrap and convert a *single* statement that isn't output.
    // `addSoloPhrase` already refuses more than one result statement, so
    // offering it there was a button that did nothing.
    expect(offersFor('value', false, false)).toContain('phrase');
    expect(offersFor('value', false, true)).not.toContain('phrase');
    expect(offersFor('text', false, true)).not.toContain('phrase');
});

test('offersFor: what several plain statements actually offer', () => {
    // Two numbers are two result statements, so the program's value is a list
    // of them — and there is no single value to make a Phrase from.
    const several = classifyOutput(make(`1\n2`));
    expect(several.isList).toBe(true);
    expect(offersFor(several.kind, false, several.isList)).not.toContain(
        'phrase',
    );
});

// --- offersFor: the type-correct transformation matrix ----------------------

test('offersFor: matrix (no stage yet)', () => {
    // No output: only a distinct "add a placeholder Phrase" offer — no wrap/create actions.
    expect(offersFor('none', false)).toEqual(['placeholder', 'music']);
    expect(offersFor('text', false)).toEqual(['phrase', 'music']);
    expect(offersFor('value', false)).toEqual(['phrase', 'music']);
    expect(offersFor('form', false)).toEqual(['shape', 'music']);
    expect(offersFor('phrase', false)).toEqual(['group', 'stage', 'music']);
    expect(offersFor('group', false)).toEqual(['stage', 'music']);
    // A Shape can be wrapped in a Stage but NOT a Group.
    expect(offersFor('shape', false)).toEqual(['stage', 'music']);
    expect(offersFor('say', false)).toEqual(['group', 'stage', 'music']);
    expect(offersFor('stage', false)).toEqual(['music']);
    // Music takes no room on stage and holds nothing, so it wraps nothing and
    // is wrapped by nothing — but another song can always be added.
    expect(offersFor('music', false)).toEqual(['music']);
});

test('offersFor: an existing Stage suppresses Group/Stage wraps', () => {
    expect(offersFor('phrase', true)).toEqual(['music']);
    expect(offersFor('shape', true)).toEqual(['music']);
    // An empty program still offers the placeholder Phrase; a bare Form still offers Shape.
    expect(offersFor('none', true)).toEqual(['placeholder', 'music']);
    expect(offersFor('form', true)).toEqual(['shape', 'music']);
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

test('music is offered in every output state', () => {
    // Music wraps nothing and displaces nothing, so unlike the other offers
    // it never depends on what's already there.
    for (const kind of [
        'none',
        'text',
        'value',
        'form',
        'phrase',
        'say',
        'group',
        'shape',
        'stage',
    ] as const) {
        expect(offersFor(kind, false), kind).toContain('music');
        expect(offersFor(kind, true), kind).toContain('music');
    }
});

test('adding music to an empty program makes a playable music', () => {
    const project = make('');
    const revised = addMusic(DB, project);
    expect(revised).toBeDefined();
    const musics = musicsIn(revised as Project);
    expect(musics).toHaveLength(1);
    // Seeded with notes, so there is something to hear and something to edit.
    const read = readMusic(revised as Project, musics[0]);
    expect(read?.tracks).toHaveLength(1);
    expect(read?.tracks[0].data.notes.map((n) => n.degrees)).toEqual([
        [1],
        [2],
        [3],
        [4],
        [5],
    ]);
    // And editable by direct manipulation, which is the whole point.
    expect(read?.tracks[0].notes).toBeDefined();
});

test('adding music to a stage puts it in the stage', () => {
    // Rather than beside it as a second, competing output.
    const project = make(`Stage([Phrase('hi')])`);
    const revised = addMusic(DB, project);
    expect(musicsIn(revised as Project)).toHaveLength(1);
    // The phrase is still there — adding music displaces nothing.
    expect(revised?.getMain().toWordplay()).toContain('hi');
});

test('adding music beside a phrase keeps the phrase', () => {
    const project = make(`Phrase('hi')`);
    const revised = addMusic(DB, project);
    expect(musicsIn(revised as Project)).toHaveLength(1);
    expect(revised?.getMain().toWordplay()).toContain('hi');
});

/** The Phrase evaluate in a program, for the move tests below. */
function phraseIn(project: Project): Evaluate {
    const evaluate = project
        .getMain()
        .expression.nodes()
        .find(
            (n): n is Evaluate =>
                n instanceof Evaluate &&
                n.is(project.shares.output.Phrase, project.getNodeContext(n)),
        );
    if (evaluate === undefined) throw new Error('No Phrase in the program');
    return evaluate;
}

/**
 * The guard that keeps a drag from committing the same place over and over.
 * Without it, each no-op revision re-mints node IDs while leaving the text
 * alone, so `Project.equals` reports no change, the evaluator is never rebuilt,
 * and the stage is left rendering IDs the project no longer has — which makes
 * the output unclickable. Snapping makes identical targets routine, since a
 * drag resting on a guide commits the same coordinates every frame.
 *
 * These model a drag: the first frame moves the phrase, and later frames on the
 * same guide ask for the place it already has. Comparing against the ORIGINAL
 * source would prove nothing, since the revision writes the locale's own name
 * for Place (`📍` in en-US) and its explicit depth, so the very first move is
 * always a real change however little the phrase travelled.
 */
function afterMove(
    code: string,
    x: number,
    y: number,
): { project: Project; phrase: Evaluate } {
    const project = make(code);
    const phrase = phraseIn(project);
    const moved = movedOutput(project, phrase, DefaultLocales, x, y, false);
    const revised = project.withRevisedNodes([[phrase, moved]]);
    return { project: revised, phrase: phraseIn(revised) };
}

test('moving an output to where it already is changes nothing', () => {
    const { project, phrase } = afterMove(
        `Phrase('hi' place: Place(1m 2m 0m))`,
        3,
        4,
    );
    expect(
        movedOutput(project, phrase, DefaultLocales, 3, 4, false).isEqualTo(
            phrase,
        ),
    ).toBe(true);
});

test('moving an output somewhere else does change it', () => {
    const { project, phrase } = afterMove(
        `Phrase('hi' place: Place(1m 2m 0m))`,
        3,
        4,
    );
    expect(
        movedOutput(project, phrase, DefaultLocales, 3, 4.5, false).isEqualTo(
            phrase,
        ),
    ).toBe(false);
});

test('a relative move of zero changes nothing', () => {
    const { project, phrase } = afterMove(
        `Phrase('hi' place: Place(1m 2m 0m))`,
        3,
        4,
    );
    expect(
        movedOutput(project, phrase, DefaultLocales, 0, 0, true).isEqualTo(
            phrase,
        ),
    ).toBe(true);
});

test('a phrase with no place of its own settles after its first move', () => {
    const { project, phrase } = afterMove(`Phrase('hi')`, 1, 1);
    expect(
        movedOutput(project, phrase, DefaultLocales, 1, 1, false).isEqualTo(
            phrase,
        ),
    ).toBe(true);
});
