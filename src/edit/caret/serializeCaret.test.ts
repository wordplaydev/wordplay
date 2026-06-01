import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Expression from '@nodes/Expression';
import { describe, expect, test } from 'vitest';
import {
    resolveCaretPosition,
    serializeCaretPosition,
} from '@edit/caret/Caret';

function makeSource(code: string): Source {
    const source = new Source('test', code);
    // Build a project so the source has a resolvable root.
    Project.make(null, 'test', source, [], DefaultLocale);
    return source;
}

describe('serialize/resolve caret position', () => {
    test('a text offset round-trips unchanged', () => {
        const source = makeSource('1 + 2');
        expect(serializeCaretPosition(source, 3)).toBe(3);
        expect(resolveCaretPosition(source, 3)).toBe(3);
    });

    test('a selection range round-trips unchanged', () => {
        const source = makeSource('1 + 2');
        expect(serializeCaretPosition(source, [1, 4])).toEqual([1, 4]);
        expect(resolveCaretPosition(source, [1, 4])).toEqual([1, 4]);
    });

    test('a node selection round-trips through its path', () => {
        const source = makeSource('1 + 2');
        // Pick a node deep in the tree to select.
        const node = source.expression
            .nodes()
            .find((n): n is Expression => n instanceof Expression);
        expect(node).toBeDefined();
        if (node === undefined) return;

        // Serializing a node yields a path (an array of {type, index}).
        const serialized = serializeCaretPosition(source, node);
        expect(Array.isArray(serialized)).toBe(true);

        // Resolving the path returns the same node.
        expect(resolveCaretPosition(source, serialized)).toBe(node);
    });

    test('an unresolvable path returns undefined', () => {
        const source = makeSource('1 + 2');
        expect(
            resolveCaretPosition(source, [{ type: 'Nonexistent', index: 99 }]),
        ).toBeUndefined();
    });
});
