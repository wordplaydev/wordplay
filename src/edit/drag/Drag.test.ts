import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import ListLiteral from '@nodes/ListLiteral';
import type Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import Source from '@nodes/Source';
import Token from '@nodes/Token';
import parseExpression from '@parser/parseExpression';
import { toTokens } from '@parser/toTokens';
import { expect, test } from 'vitest';
import { dropNodeOnSource, InsertionPoint, isValidDropTarget } from './Drag';

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

        // Assert that the drop target is valid.
        expect(
            isValidDropTarget(
                project,
                draggedNode,
                targetNode instanceof InsertionPoint
                    ? targetNode.node
                    : targetNode,
                targetNode instanceof InsertionPoint ? targetNode : undefined,
                true,
            ),
        ).toBe(true);

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
