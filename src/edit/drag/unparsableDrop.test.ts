import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Source from '#nodes/Source.ts';
import UnparsableExpression from '#nodes/UnparsableExpression.ts';
import { must } from '#util/nullable.ts';
import { expect, test } from 'vitest';
import {
    dropNodeOnSource,
    isValidDropTarget,
    kindAcceptsDrop,
    resolvePermittedDropTarget,
} from './Drag.ts';

/** A program that is one unparsable token, and a number from the palette. */
function broken(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const unparsable = must(
        source.nodes().find((node) => node instanceof UnparsableExpression),
        'an unparsable expression',
    );
    const number = must(
        new Source('palette', '5').find(NumberLiteral),
        'a number',
    );
    return { source, project, unparsable, number };
}

test.each([')', ']', '}'])(
    'unparsable code %s can be replaced by a drop',
    (code) => {
        const { source, project, unparsable, number } = broken(code);
        expect(isValidDropTarget(project, [number], unparsable)).toBe(true);
        const permitted = resolvePermittedDropTarget(
            project,
            source,
            [number],
            unparsable,
        );
        expect(permitted).toBe(unparsable);
        const [, repaired] = dropNodeOnSource(
            project,
            source,
            [number],
            unparsable,
        );
        expect(repaired.code.toString().trim()).toEqual('5');
    },
);

test('unparsable code holds tokens, so nothing can be dragged into it', () => {
    // Its field was declared as a list of any node, so the editor offered an
    // insertion into the token list in place of replacing the node, and the
    // result was still unparsable — the drop that fixes a broken program was
    // the one drop that was refused.
    const { unparsable, number } = broken(')');
    const kind = must(unparsable.getFieldNamed('unparsables'), 'a field').kind;
    expect(kindAcceptsDrop(kind, [number])).toBe(false);
});
