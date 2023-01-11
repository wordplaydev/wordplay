import { test, expect } from 'vitest';
import Caret from './Caret';
import Project from '../../models/Project';
import Source from '../../nodes/Source';
import Append from '../../transforms/Append';
import Replace from '../../transforms/Replace';
import { getEditsAt } from './Autocomplete';
import type Node from '../../nodes/Node';
import MeasurementLiteral from '../../nodes/MeasurementLiteral';
import Add from '../../transforms/Add';

test.each([
    ['a: 1 a +**', undefined, Replace, 'a'],
    ['a•?:**', undefined, Replace, '⊤'],
    [`ƒ sum(a•? b•?) a & b\nsum(**)`, undefined, Append, '⊤'],
    [`ƒ sum(a•? b•?) a & b\nsum()**`, undefined, Replace, '(sum()) = _'],
    [`"hi".**`, undefined, Add, 'length'],
    [`•Cat(hat•"")\nboomy: Cat("none")\nboomy.**`, undefined, Add, 'hat'],
    // Selecting 2 should offer to replace with c
    [
        `c: 1\n1 + 2`,
        (node: Node) =>
            node instanceof MeasurementLiteral && node.toWordplay() === '2',
        Replace,
        'c',
    ],
])(
    'Code %s should have a transform',
    (
        code: string,
        position: ((node: Node) => boolean) | undefined,
        kind: Function,
        edit: string
    ) => {
        // See if there's a placeholder for the caret.
        const insertionPoint = code.indexOf('**');
        if (insertionPoint >= 0)
            code =
                code.substring(0, insertionPoint) +
                code.substring(insertionPoint + 2);

        const source = new Source('test', code);
        const project = new Project('test', source, []);
        let resolvedPosition =
            position === undefined
                ? insertionPoint
                : source.nodes().find((node) => position(node));
        expect(resolvedPosition).toBeDefined();
        if (resolvedPosition) {
            const caret = new Caret(source, resolvedPosition);
            const transforms = getEditsAt(project, caret);
            const match = transforms.some(
                (transform) =>
                    transform instanceof kind &&
                    transform.getNewNode(['en'])?.toWordplay() === edit
            );
            expect(match).toBeTruthy();
        }
    }
);
