import { test, expect } from 'vitest';
import Project from '../models/Project';
import Source from '../nodes/Source';
import Tree from '../nodes/Tree';
import { dropNodeOnSource, InsertionPoint } from './Drag';
import type Node from '../nodes/Node';
import ExpressionPlaceholder from '../nodes/ExpressionPlaceholder';
import { parseExpression, toTokens } from '../parser/Parser';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import ListLiteral from '../nodes/ListLiteral';
import Token from '../nodes/Token';

test.each([
    // Replace placeholder with rootless expression
    [
        ['1 + _'],
        () => new Tree(parseExpression(toTokens('1'))),
        (sources: Source[]) =>
            sources[0].nodes(
                (node) => node instanceof ExpressionPlaceholder
            )[0],
        '1 + 1',
    ],
    // Replace placeholder with expression from same source
    [
        ['1 + _\n2'],
        (sources: Source[]) =>
            sources[0].get(sources[0].find(MeasurementLiteral, 1)) as Tree,
        (sources: Source[]) => sources[0].find(ExpressionPlaceholder),
        '1 + 2\n',
    ],
    // Replace placeholder with expression from other source
    [
        ['1 + _', '2'],
        (sources: Source[]) =>
            sources[1].get(sources[1].find(MeasurementLiteral)) as Tree,
        (sources: Source[]) =>
            sources[0].nodes(
                (node) => node instanceof ExpressionPlaceholder
            )[0],
        '1 + 2',
        '',
    ],
    // Insertion rootless expression in source
    [
        ['[ 1 3 4 5 ]'],
        () => new Tree(parseExpression(toTokens('2'))),
        (sources: Source[]) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find(Token, 2),
                0,
                1
            );
        },
        '[ 1 2 3 4 5 ]',
    ],
    // Insertion expression from source in expression
    [
        ['[ 1 3 4 5 ]\n2'],
        (sources) =>
            sources[0].get(sources[0].find(MeasurementLiteral, 4)) as Tree,
        (sources) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find(Token, 2),
                0,
                1
            );
        },
        '[ 1 2 3 4 5 ]\n',
    ],
    // Insert expression from other source in expression
    [
        ['[ 1 3 4 5 ]', '2'],
        (sources) =>
            sources[1].get(sources[1].find(MeasurementLiteral)) as Tree,
        (sources) => {
            const node = sources[0].find<ListLiteral>(ListLiteral);
            return new InsertionPoint(
                node,
                'values',
                node.values,
                node.find(Token, 2),
                0,
                1
            );
        },
        '[ 1 2 3 4 5 ]',
        '',
    ],
])(
    'Drop on %s should yield %s',
    (
        source: string[],
        dragged: (sources: Source[]) => Tree,
        target: (sources: Source[]) => Node | InsertionPoint,
        mainExpected: string,
        supplementExpected?: string
    ) => {
        const sources = source.map((s) => new Source('test', s));
        const project = new Project('test', sources[0], sources.slice(1));
        const [newProject] = dropNodeOnSource(
            project,
            sources[0],
            dragged(sources),
            target(sources)
        ) ?? [undefined, undefined];

        expect(newProject).toBeDefined();
        expect(newProject?.main.toWordplay()).toBe(mainExpected);
        if (supplementExpected)
            expect(newProject?.supplements[0].toWordplay()).toBe(
                supplementExpected
            );
    }
);
