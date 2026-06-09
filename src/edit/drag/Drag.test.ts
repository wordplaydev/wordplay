import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import ListLiteral from '@nodes/ListLiteral';
import type Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import Source from '@nodes/Source';
import TextLiteral from '@nodes/TextLiteral';
import Token from '@nodes/Token';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { expect, test } from 'vitest';
import {
    dropNodeOnSource,
    getBlockingDropConflicts,
    getDropConflicts,
    InsertionPoint,
    isDropPermitted,
    isValidDropTarget,
} from '@edit/drag/Drag';

test.each([
    // Replace placeholder with rootless expression
    [
        ['1 + _'],
        () => parseExpression(toTokens('1')),
        (sources: Source[]) =>
            sources[0].nodes(
                (node): node is ExpressionPlaceholder =>
                    node instanceof ExpressionPlaceholder,
            )[0],
        '1 + 1',
    ],
    // Replace placeholder with expression from same source
    [
        ['1 + _\n2'],
        (sources: Source[]) => sources[0].find(NumberLiteral, 1),
        (sources: Source[]) => sources[0].find(ExpressionPlaceholder),
        '1 + 2\n',
    ],
    // Replace placeholder with expression from other source
    [
        ['1 + _', '2'],
        (sources: Source[]) => sources[1].find<Node>(NumberLiteral),
        (sources: Source[]) =>
            sources[0].nodes(
                (node): node is ExpressionPlaceholder =>
                    node instanceof ExpressionPlaceholder,
            )[0],
        '1 + 2',
        '',
    ],
    // Insertion rootless expression in source
    [
        ['[1 3 4 5]'],
        () => parseExpression(toTokens('2')),
        (sources: Source[]) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find<Token>(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]',
    ],
    // Insertion expression from source in expression
    [
        ['[1 3 4 5]\n2'],
        (sources) => sources[0].find(NumberLiteral, 4),
        (sources) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find<Token>(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]\n',
    ],
    // Insert expression from other source in expression
    [
        ['[1 3 4 5]', '2'],
        (sources) => sources[1].find(NumberLiteral),
        (sources) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find<Token>(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]',
        '',
    ],
    // Drop reaction with placeholders onto a typed bind.
    [
        ['a•#: _'],
        () => parseExpression(toTokens('_ … _•? … _')),
        (sources) => sources[0].find(ExpressionPlaceholder),
        'a•#: _ … _•? … _',
    ],
    // Drop list onto typed list
    [
        ['a•[#]: _'],
        () => parseExpression(toTokens('[]')),
        (sources) => sources[0].find(ExpressionPlaceholder),
        'a•[#]: []',
    ],
    // Insert number into unit-typed number list, despite type error.
    [
        ['Place()'],
        () => parseExpression(toTokens('1')),
        (sources) => {
            const node = sources[0].find<Evaluate>(Evaluate);
            return new InsertionPoint(
                node,
                'inputs',
                node.inputs,
                node.find<Token>(Token, 2),
                0,
                0,
            );
        },
        'Place(1)',
    ],
])(
    'Drop on %s should yield %s',
    (
        source: string[],
        dragged: (sources: Source[]) => Node,
        target: (sources: Source[]) => Node | InsertionPoint,
        mainExpected: string,
        supplementExpected?: string,
    ) => {
        const sources = source.map((s) => new Source('test', s));
        const project = Project.make(
            null,
            'test',
            sources[0],
            sources.slice(1),
            DefaultLocale,
        );

        const draggedNode: Node = dragged(sources);
        const targetNode: Node | InsertionPoint = target(sources);

        // Node targets must be structurally valid drop targets. (Insertion points carry their own
        // structural validity from detection, so isValidDropTarget doesn't apply to them.)
        if (!(targetNode instanceof InsertionPoint))
            expect(isValidDropTarget(project, draggedNode, targetNode)).toBe(
                true,
            );

        const [newProject] = dropNodeOnSource(
            project,
            sources[0],
            draggedNode,
            targetNode,
        ) ?? [undefined, undefined];

        // Assert that the new project matches expectations.
        expect(newProject).toBeDefined();
        expect(newProject?.getMain().toWordplay()).toBe(mainExpected);
        if (supplementExpected)
            expect(newProject?.getSupplements()[0].toWordplay()).toBe(
                supplementExpected,
            );
    },
);

test('getDropConflicts returns [] for a clean placeholder replacement', () => {
    const source = new Source('test', '1 + _');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('1'));
    const target = source.find(ExpressionPlaceholder);
    expect(
        getDropConflicts(project, source, dragged, target).conflicts,
    ).toHaveLength(0);
});

test('getDropConflicts returns [] when a drop only leaves a placeholder behind (cross-source)', () => {
    const main = new Source('test', '1 + _');
    const supplement = new Source('other', '2');
    const project = Project.make(
        null,
        'test',
        main,
        [supplement],
        DefaultLocale,
    );
    // Drag the 2 from the other source onto the placeholder; the donor source is left with a
    // placeholder (a minor conflict), which must not count as a new conflict.
    const dragged = supplement.find<Node>(NumberLiteral);
    const target = main.find(ExpressionPlaceholder);
    expect(
        getDropConflicts(project, main, dragged, target).conflicts,
    ).toHaveLength(0);
});

test('getDropConflicts reports the conflict a type-erroring drop would introduce', () => {
    const source = new Source('test', 'Place()');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('1'));
    const node = source.find<Evaluate>(Evaluate);
    const target = new InsertionPoint(
        node,
        'inputs',
        node.inputs,
        node.find<Token>(Token, 2),
        0,
        0,
    );
    // The drop is permitted (Place(1) is produced) but introduces a major conflict we can explain.
    expect(
        getDropConflicts(project, source, dragged, target).conflicts.length,
    ).toBeGreaterThan(0);
});

test('a drop that creates an unknown name is blocked (Error severity)', () => {
    const source = new Source('test', '1 + _');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    // Dragging a reference to an undefined name onto the placeholder → `1 + saddf` → unknown name.
    const dragged = parseExpression(toTokens('saddf'));
    const target = source.find(ExpressionPlaceholder);
    expect(
        getBlockingDropConflicts(project, source, dragged, target).map(
            (c) => c.constructor.name,
        ),
    ).toContain('UnknownName');
    expect(isDropPermitted(project, source, dragged, target)).toBe(false);
});

test('a type-mismatch drop is blocked (Error severity)', () => {
    const source = new Source('test', 'a•#: _');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    // Dropping text into a number-typed bind is a type mismatch — a blocking error.
    const dragged = parseExpression(toTokens('"hi"'));
    const target = source.find(ExpressionPlaceholder);
    expect(isDropPermitted(project, source, dragged, target)).toBe(false);
    expect(
        getBlockingDropConflicts(project, source, dragged, target).map(
            (c) => c.constructor.name,
        ),
    ).toContain('IncompatibleType');
});

test('dropping a structure into a wrong-typed function input is blocked', () => {
    // The reported defect: Group is not valid for Phrase's text input, so `'a'` must not be a drop target.
    const source = new Source('test', "Phrase('a')");
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const dragged = parseExpression(toTokens('Group(_ _)'));
    const target = source.find(TextLiteral);
    expect(isDropPermitted(project, source, dragged, target)).toBe(false);
    expect(
        getBlockingDropConflicts(project, source, dragged, target).map(
            (c) => c.constructor.name,
        ),
    ).toContain('IncompatibleInput');
});
