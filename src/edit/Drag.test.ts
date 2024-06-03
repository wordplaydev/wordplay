import { test, expect } from 'vitest';
import Project from '@models/Project';
import Source from '@nodes/Source';
import { dropNodeOnSource, InsertionPoint } from './Drag';
import type Node from '@nodes/Node';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import NumberLiteral from '@nodes/NumberLiteral';
import ListLiteral from '@nodes/ListLiteral';
import Token from '@nodes/Token';
import { toTokens } from '../parser/toTokens';
import parseExpression from '../parser/parseExpression';
import DefaultLocale from '../locale/DefaultLocale';

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
                node.find(Token, 2),
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
                node.find(Token, 2),
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
                node.find(Token, 2),
                0,
                1,
            );
        },
        '[1 2 3 4 5]',
        '',
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
        const [newProject] = dropNodeOnSource(
            project,
            sources[0],
            dragged(sources),
            target(sources),
        ) ?? [undefined, undefined];

        expect(newProject).toBeDefined();
        expect(newProject?.getMain().toWordplay()).toBe(mainExpected);
        if (supplementExpected)
            expect(newProject?.getSupplements()[0].toWordplay()).toBe(
                supplementExpected,
            );
    },
);
