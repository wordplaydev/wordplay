import { test, expect } from 'vitest';
import Caret from './Caret';
import Project from '@models/Project';
import Source from '@nodes/Source';
import { getEditsAt } from './Autocomplete';
import type Node from '@nodes/Node';
import Assign from './Assign';
import Replace from './Replace';
import NumberLiteral from '../nodes/NumberLiteral';
import Append from './Append';
import Reference from '../nodes/Reference';
import type Revision from './Revision';
import DefaultLocale, { DefaultLocales } from '../locale/DefaultLocale';

test.each([
    ['blank program suggestions', '**', undefined, Append, '0'],
    ['set unset bind value', 'a:**', undefined, Assign, '0'],
    ['suggest binary evaluate completions', '1 + **', undefined, Assign, '1'],
    [
        'suggest conditional on boolean value',
        'b: ⊥\nb',
        (node: Node) => node instanceof Reference,
        Replace,
        'b ? _ _',
    ],
    ['suggest phrase on empty program', '**', undefined, Append, '💬(_)'],
    [
        'complete phrase on empty program',
        'Ph**',
        undefined,
        Replace,
        'Phrase(_)',
    ],
    [
        'suggest matching evaluates',
        'Group(Row() [**])',
        undefined,
        Append,
        '💬(_)',
    ],
    [
        'suggest evaluate on function',
        `ƒ sum(a•? b•?) a & b\ns**`,
        undefined,
        Replace,
        'sum(_ _)',
    ],
    [
        'suggest evaluate wrap',
        `ƒ sum(a•? b•?) a & b\nsum()**`,
        undefined,
        Replace,
        '(sum())',
    ],
    [
        'suggest structure function eval',
        `"hi".**`,
        undefined,
        Replace,
        '"hi".📏()',
    ],
    ['suggest structure property', `"hi".**`, undefined, Replace, '"hi" = _'],
    ['suggest binary evalute', `1**`, undefined, Replace, '1 + _'],
    [
        'suggest property reference',
        `•Cat(hat•"")\nboomy: Cat("none")\nboomy.**`,
        undefined,
        Replace,
        'boomy.hat',
    ],
    // Selecting 2 should offer to replace with c
    [
        'suggest bind reference',
        `c: 1\n1 + 2`,
        (node: Node) =>
            node instanceof NumberLiteral && node.toWordplay() === '2',
        Replace,
        'c',
    ],
    // Lists should suggest bindings in scope
    [
        'suggest insertion of binding in scope',
        `a:'hello'\n[ "hi" **]`,
        undefined,
        Append,
        'a',
    ],
    ['suggest unit', '1**', undefined, Assign, 'ms'],
    ['suggest additional denominator', '1m**', undefined, Replace, 'm·min'],
    ['suggest denominator', '1m**', undefined, Replace, 'm/s'],
])(
    '%s: %s',
    (
        description: string,
        code: string,
        position: ((node: Node) => boolean) | undefined,
        kind: new (...params: never[]) => Revision,
        edit: string
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
                undefined
            );
            const transforms = getEditsAt(project, caret, DefaultLocales);

            const match = transforms.find(
                (transform) =>
                    transform instanceof kind &&
                    transform.getNewNode(DefaultLocales)?.toWordplay() === edit
            );
            if (match === undefined) {
                console.error(
                    transforms
                        .map(
                            (t) =>
                                `${t.constructor.name}\t${t
                                    .getNewNode(DefaultLocales)
                                    ?.toWordplay()}`
                        )
                        .join('\n')
                );
            }

            expect(match?.getNewNode(DefaultLocales)?.toWordplay()).toBe(edit);
        }
    }
);
