import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocales from '@locale/DefaultLocales';
import BooleanLiteral from '@nodes/BooleanLiteral';
import Evaluate from '@nodes/Evaluate';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import StreamType from '@nodes/StreamType';
import Unit from '@nodes/Unit';
import getPreferredSpaces from '@parser/getPreferredSpaces';
import { TRUE_SYMBOL } from '@parser/Symbols';
import { expect, test } from 'vitest';
import DefaultLocale from '../../locale/DefaultLocale';
import NumberLiteral from '../../nodes/NumberLiteral';
import Append from '../revision/Append';
import Assign from '../revision/Assign';
import Replace from '../revision/Replace';
import type Revision from '../revision/Revision';
import { getEditsAt } from './PossibleEdits';

test.each([
    ['blank programs suggest numbers', '**', undefined, Append, '0'],
    ['blank programs suggest booleans', '**', undefined, Append, TRUE_SYMBOL],
    ['blank programs suggest text', '**', undefined, Append, "''"],
    ['blank programs suggest lists', '**', undefined, Append, '[]'],
    ['blank programs suggest sets', '**', undefined, Append, '{}'],
    ['blank programs suggest maps', '**', undefined, Append, '[]'],
    ['blank programs suggest tables', '**', undefined, Append, '[]'],
    ['set unset bind value', 'a:**', undefined, Assign, '0'],
    ['suggest binary evaluate completions', '1 + **', undefined, Assign, '1'],
    [
        'suggest conditional on boolean value',
        'b: ⊥',
        (node: Node) => node instanceof BooleanLiteral,
        Replace,
        '⊥ ? ⊤ ⊥',
    ],
    ['suggest phrase on empty program', '**', undefined, Append, "💬('')"],
    [
        'complete phrase on empty program',
        'Ph**',
        undefined,
        Replace,
        "Phrase('')",
    ],
    [
        'suggest matching evaluates',
        'Group(Row() [**])',
        undefined,
        Append,
        "💬('')",
    ],
    [
        'suggest evaluate on function',
        `ƒ sum(a•? b•?) a & b\ns**`,
        undefined,
        Replace,
        'sum(⊤ ⊤)',
    ],
    [
        'suggest evaluate wrap',
        `ƒ sum(a•? b•?) a & b\nsum()`,
        (node) => node instanceof Evaluate,
        Replace,
        '(sum())',
    ],
    ['suggest basis function eval', `"hi".**`, undefined, Replace, '"hi".📏()'],
    [
        'suggest binary evaluate',
        `1**`,
        (node) => node instanceof NumberLiteral,
        Replace,
        '1 ÷ _•#',
    ],
    [
        'complete property reference',
        `•Cat(hat•"")\nboomy: Cat("none")\nboomy.**`,
        undefined,
        Replace,
        'boomy.hat',
    ],
    [
        'suggest reference to replace node',
        `c: 1\n1 + 2`,
        (node: Node) =>
            node instanceof NumberLiteral && node.toWordplay() === '2',
        Replace,
        'c',
    ],
    [
        'suggest insertion of in scope bind in list',
        `a:'hello'\n[ "hi" **]`,
        undefined,
        Append,
        'a',
    ],
    [
        'suggest insertion of in scope bind in block',
        'a: 1\n**',
        undefined,
        Append,
        'a',
    ],
    ['suggest unit', '1**', undefined, Assign, 'ms'],
    [
        'suggest additional denominator',
        '1m**',
        (node) => node instanceof Unit,
        Replace,
        'm·min',
    ],
    [
        'suggest denominator',
        '1m**',
        (node) => node instanceof Unit,
        Replace,
        'm/s',
    ],
    [
        'suggest streams on stream placeholders',
        '∆ _•…_',
        (node) =>
            node instanceof ExpressionPlaceholder &&
            node.type instanceof StreamType,
        Replace,
        '🖱️()',
    ],
    [
        'suggest negation on number expressions',
        '5',
        (node) => node instanceof NumberLiteral,
        Replace,
        '-5',
    ],
])(
    '%s: %s',
    (
        description: string,
        code: string,
        position: ((node: Node) => boolean) | undefined,
        kind: new (...params: never[]) => Revision,
        edit: string,
    ) => {
        // See if there's a placeholder for the caret.
        const insertionPoint = code.indexOf('**');
        if (insertionPoint >= 0)
            code =
                code.substring(0, insertionPoint) +
                code.substring(insertionPoint + 2);

        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        const resolvedPosition =
            position === undefined
                ? insertionPoint
                : source.nodes().find((node) => position(node));
        expect(resolvedPosition).toBeDefined();
        if (resolvedPosition !== undefined) {
            const caret = new Caret(
                source,
                resolvedPosition,
                undefined,
                undefined,
                undefined,
            );
            const transforms = getEditsAt(
                project,
                caret,
                undefined,
                DefaultLocales,
            );

            const match = transforms.find((transform) => {
                const newNode = transform.getNewNode(DefaultLocales);
                return (
                    transform instanceof kind &&
                    newNode &&
                    newNode.toWordplay(getPreferredSpaces(newNode)) === edit
                );
            });
            if (match === undefined) {
                console.error(
                    transforms
                        .map(
                            (t) =>
                                `${t.constructor.name}\t${t
                                    .getNewNode(DefaultLocales)
                                    ?.toWordplay()}`,
                        )
                        .join('\n'),
                );
            }

            const newNode = match?.getNewNode(DefaultLocales);

            expect(
                newNode?.toWordplay(getPreferredSpaces(newNode)),
                description,
            ).toBe(edit);
        }
    },
);
