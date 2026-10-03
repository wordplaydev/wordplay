import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Bind from '#nodes/Bind.ts';
import ListLiteral from '#nodes/ListLiteral.ts';
import type Node from '#nodes/Node.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Source from '#nodes/Source.ts';
import { must } from '#util/nullable.ts';
import { expect, test } from 'vitest';
import { moveNode, type MoveDirection } from './Drag.ts';

/** The number literals with the given texts, in order. */
function numbers(source: Source, ...texts: string[]): Node[] {
    return texts.map((text) =>
        must(
            source
                .nodes()
                .find(
                    (node): node is NumberLiteral =>
                        node instanceof NumberLiteral &&
                        node.toWordplay() === text,
                ),
            `number ${text}`,
        ),
    );
}

/** Move the given numbers and return the code without whitespace, or undefined. */
function move(
    code: string,
    picks: string[],
    direction: MoveDirection,
): string | undefined {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const result = moveNode(
        project,
        source,
        numbers(source, ...picks),
        direction,
    );
    return result?.source.code.toString().replace(/\s+/g, '');
}

test.each<[string, string, string[], MoveDirection, string | undefined]>([
    ['swaps with the sibling before', '[1 2 3]', ['2'], 'before', '[213]'],
    ['swaps with the sibling after', '[1 2 3]', ['2'], 'after', '[132]'],
    [
        'moves a run after the sibling that follows it',
        '[1 2 3 4]',
        ['1', '2'],
        'after',
        '[3124]',
    ],
    ['escapes a list at its start', '[1 2 3]', ['1'], 'before', '1[23]'],
    ['escapes a list at its end', '[1 2 3]', ['3'], 'after', '[12]3'],
    ['lifts a node out beside what holds it', '[1 2 3]', ['2'], 'out', '[13]2'],
    ['puts a node into the list beside it', '1\n[2 3]', ['1'], 'in', '[123]'],
    [
        'puts a node into the list before it when nothing follows',
        '[1 2]\n3',
        ['3'],
        'in',
        '[123]',
    ],
    ['has nowhere to go into a number', '1\n2', ['1'], 'in', undefined],
    ['has nowhere to go out of the program', '1\n2', ['1'], 'out', undefined],
])('%s', (_, code, picks, direction, expected) => {
    expect(move(code, picks, direction)).toEqual(expected);
});

test('refuses a move the program could not survive', () => {
    // A bind's only name has no list to swap in and no ancestor list that takes
    // a name, so there is nowhere for it to go.
    const source = new Source('test', 'a: 1');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const name = must(source.find(Bind)?.names.names[0], 'a name');
    expect(moveNode(project, source, [name], 'before')).toBeUndefined();
});

test('the moved nodes are the clones in the new source', () => {
    const source = new Source('test', '[1 2]');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const result = must(
        moveNode(project, source, numbers(source, '1'), 'after'),
        'a move',
    );
    const moved = must(result.moved[0], 'a moved node');
    expect(result.source.root.getParent(moved)).toBeInstanceOf(ListLiteral);
    expect(result.project.contains(moved)).toBe(true);
});

/** Move the statements at the given indices and return the exact code. */
function moveStatements(
    code: string,
    indices: number[],
    directions: MoveDirection[],
): string {
    let source = new Source('test', code);
    let project = Project.make(null, 'test', source, [], DefaultLocale);
    let picks = indices;
    for (const direction of directions) {
        const statements = source.expression.expression.statements;
        const nodes = picks.map((index) =>
            must(statements[index], 'a statement'),
        );
        const result = must(
            moveNode(project, source, nodes, direction),
            `a move ${direction}`,
        );
        project = result.project;
        source = result.source;
        const moved = source.expression.expression.statements;
        picks = result.moved.map((node) =>
            moved.findIndex((statement) => statement === node),
        );
    }
    return source.code.toString();
}

test.each([
    ["Phrase('a')\nPhrase('b')", [1]],
    ["Phrase('a')\n\nPhrase('b')\nPhrase('c')", [1]],
    ['1\n2\n3\n4', [1, 2]],
])('a swap is its own inverse, spaces and all: %j', (code, indices) => {
    // The second statement kept its line break when it became first, and
    // formatting added another below it, so each round trip grew a blank line.
    expect(moveStatements(code, indices, ['before', 'after'])).toEqual(code);
    expect(
        moveStatements(code, indices, [
            'before',
            'after',
            'before',
            'after',
            'before',
            'after',
            'before',
            'after',
            'before',
            'after',
        ]),
    ).toEqual(code);
});

test('a swap leaves no line break above the first statement', () => {
    expect(moveStatements("Phrase('a')\nPhrase('b')", [1], ['before'])).toEqual(
        "Phrase('b')\nPhrase('a')",
    );
});

test('a swap inside an inline list keeps it on one line', () => {
    const source = new Source('test', '[1 2 3]');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const result = must(
        moveNode(project, source, numbers(source, '2'), 'after'),
        'a move',
    );
    expect(result.source.code.toString()).toEqual('[1 3 2]');
});
