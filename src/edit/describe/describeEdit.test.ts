import Project from '#db/projects/Project.ts';
import Caret from '#edit/caret/Caret.ts';
import { getEditsAt } from '#edit/menu/PossibleEdits.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import type Node from '#nodes/Node.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Source from '#nodes/Source.ts';
import { expect, test } from 'vitest';
import describeEdit, { spokenMarkup, type EditCause } from './describeEdit.ts';
import type { Verbosity } from './Verbosity.ts';

/** Describe an edit from `before` to `after` with the given cause. */
function describe(
    before: string,
    after: string,
    cause: (afterSource: Source) => EditCause,
    verbosity: Verbosity = 'normal',
    caret?: (afterSource: Source) => Caret,
) {
    const earlier = new Source('test', before);
    const later = earlier.withCode(after);
    const project = Project.make(null, 'test', later, [], DefaultLocale);
    const context = project.getContext(later);
    return describeEdit(
        earlier,
        later,
        caret?.(later) ?? new Caret(later, 0, undefined, undefined),
        cause(later),
        context.getBasis().locales,
        context,
        verbosity,
    );
}

/** The number literal with the given text in a source. */
function number(source: Source, text: string): Node {
    const node = source
        .nodes()
        .find(
            (node): node is NumberLiteral =>
                node instanceof NumberLiteral && node.toWordplay() === text,
        );
    if (node === undefined) throw new Error(`no number ${text}`);
    return node;
}

test('a drop says what moved and what now holds it', () => {
    const said = describe('[1 2]\n3', '[1 2 3]', (after) => ({
        kind: 'drop',
        nodes: [number(after, '3')],
        copied: false,
    }));
    expect(said).toBeDefined();
    expect(said).toContain('3');
    expect(said?.toLowerCase()).toContain('list');
    expect(said?.toLowerCase()).toContain('moved');
});

test('a drop from the palette is a copy, not a move', () => {
    const moved = describe('[1 2]', '[1 2 3]', (after) => ({
        kind: 'drop',
        nodes: [number(after, '3')],
        copied: false,
    }));
    const copied = describe('[1 2]', '[1 2 3]', (after) => ({
        kind: 'drop',
        nodes: [number(after, '3')],
        copied: true,
    }));
    expect(copied).not.toEqual(moved);
    expect(copied?.toLowerCase()).toContain('copied');
});

test('two drops into different places are two announcements', () => {
    const intoList = describe('[1]\n{2}\n3', '[1 3]\n{2}', (after) => ({
        kind: 'drop',
        nodes: [number(after, '3')],
        copied: false,
    }));
    const intoSet = describe('[1]\n{2}\n3', '[1]\n{2 3}', (after) => ({
        kind: 'drop',
        nodes: [number(after, '3')],
        copied: false,
    }));
    expect(intoList).not.toEqual(intoSet);
});

test('a drop onto the program names no holder', () => {
    const said = describe('1', '1\n2', (after) => ({
        kind: 'drop',
        nodes: [number(after, '2')],
        copied: false,
    }));
    expect(said).toBeDefined();
    expect(said).not.toContain('undefined');
    expect(said?.toLowerCase()).not.toContain('program');
});

test('a menu insertion defers to the caret, which names the addition', () => {
    // Build a real revision: the edits offered in an empty program.
    const source = new Source('test', '');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, 0, undefined, undefined);
    const revision = getEditsAt(
        project,
        caret,
        undefined,
        project.getContext(source).getBasis().locales,
        undefined,
        [],
        undefined,
    )[0];
    if (revision === undefined) throw new Error('no revisions offered');
    const edit = revision.getEdit(
        project.getContext(source).getBasis().locales,
    );
    if (!Array.isArray(edit)) throw new Error('revision made no edit');
    const [after, newCaret] = edit;
    if (!(after instanceof Source)) throw new Error('revision made no source');
    const context = project.withSource(source, after).getContext(after);
    expect(
        describeEdit(
            source,
            after,
            newCaret,
            { kind: 'menu', revision },
            context.getBasis().locales,
            context,
            'normal',
        ),
    ).toBeUndefined();
    expect(newCaret.addition).toBeDefined();
});

test('recycling names what was removed', () => {
    const said = describe('[1 2]', '[1]', (after) => ({
        kind: 'recycle',
        nodes: [number(new Source('t', '[1 2]'), '2')],
    }));
    expect(said?.toLowerCase()).toContain('removed');
    expect(said?.toLowerCase()).toContain('number');
});

test('replace all says how many and what they became', () => {
    const said = describe('a + a', 'b + b', () => ({
        kind: 'replace',
        count: 2,
        text: 'b',
    }));
    expect(said).toContain('2');
    expect(said).toContain('b');
});

test('a command is described by the text it changed', () => {
    expect(
        describe('1', '(1)', () => ({ kind: 'command', id: 'parenthesize' })),
    ).toContain('(1)');
    expect(
        describe('[1 2]', '[1]', () => ({
            kind: 'command',
            id: 'x',
        }))?.toLowerCase(),
    ).toContain('removed');
    expect(
        describe('1', '1', () => ({ kind: 'command', id: 'tidy' })),
    ).toBeUndefined();
});

test('terse readers hear only the caret', () => {
    expect(
        describe(
            '[1 2]',
            '[1 2 3]',
            (after) => ({
                kind: 'drop',
                nodes: [number(after, '3')],
                copied: false,
            }),
            'terse',
        ),
    ).toBeUndefined();
});

test('verbose adds the type of what was dropped', () => {
    const cause = (after: Source): EditCause => ({
        kind: 'drop',
        nodes: [
            after
                .nodes()
                .find(
                    (node): node is ListLiteral =>
                        node instanceof ListLiteral &&
                        node.toWordplay() === '[2]',
                ) ?? number(after, '2'),
        ],
        copied: false,
    });
    const normal = describe('[1 [2]]', '[1 [2]]', cause, 'normal');
    const verbose = describe('[1 [2]]', '[1 [2]]', cause, 'verbose');
    expect(verbose).toBeDefined();
    expect((verbose ?? '').length).toBeGreaterThanOrEqual(
        (normal ?? '').length,
    );
});

test('a concept link in an explanation is spoken as the concept\u2019s name', () => {
    // toText() leaves a link as its source, which a screen reader spells out.
    const said = spokenMarkup(
        '@FunctionDefinition here, @UnparsableExpression is lost',
        DefaultLocale,
    );
    expect(said).not.toContain('@');
    expect(said).not.toContain('FunctionDefinition');
    expect(said).toContain('here');
});
