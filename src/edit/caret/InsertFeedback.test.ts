import Caret from '@edit/caret/Caret';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import type Conflict from '@conflicts/Conflict';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** Insert `text` at `position` in `code` and capture any blocks-mode rejection conflicts. */
function insert(code: string, position: number, text: string, blocks: boolean) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const caret = new Caret(source, position, undefined, undefined, undefined);
    let rejected: { conflicts: Conflict[]; source: Source } | undefined;
    const result = caret.insert(
        text,
        blocks,
        project,
        false,
        (conflicts, newSource) => {
            rejected = { conflicts, source: newSource };
        },
    );
    return { rejectedByGate: typeof result === 'function', rejected };
}

test('a blocks-mode insertion that would not parse is rejected, and reports its conflicts', () => {
    // Inserting a stray `)` after `1` makes the source unparsable.
    const { rejectedByGate, rejected } = insert('1', 1, ')', true);
    expect(rejectedByGate).toBe(true);
    expect(rejected).toBeDefined();
    expect(rejected?.conflicts.length).toBeGreaterThan(0);
    // The reported source is the one the rejected insertion would have produced.
    expect(rejected?.source.getCode().toString()).toBe('1)');
});

test('a clean blocks-mode insertion is accepted and reports no rejection', () => {
    // Pasting a number into a list is structurally valid: `[1 2]` becomes `[0 1 2]`.
    const { rejectedByGate, rejected } = insert('[1 2]', 1, '0 ', true);
    expect(rejectedByGate).toBe(false);
    expect(rejected).toBeUndefined();
});

test('an insertion that creates a reference to an undefined name is rejected (Error severity)', () => {
    // Pasting/typing `saddf` into `1 + _` makes `1 + saddf` — an unknown name, which is a blocking error.
    const { rejectedByGate, rejected } = insert('1 + _', 4, 'saddf', true);
    expect(rejectedByGate).toBe(true);
    expect(rejected?.conflicts.map((c) => c.constructor.name)).toContain(
        'UnknownName',
    );
});

test('a type-mismatch insertion is rejected (Error severity)', () => {
    // Putting text into a number-typed bind (`a•#: "hi"`) is a type mismatch — a blocking error,
    // so the blocks-mode gate rejects it.
    const { rejectedByGate, rejected } = insert('a•#: _', 5, '"hi"', true);
    expect(rejectedByGate).toBe(true);
    expect(rejected?.conflicts.map((c) => c.constructor.name)).toContain(
        'IncompatibleType',
    );
});

test('the rejection callback only fires in blocks mode', () => {
    // The same unparsable insertion in text mode is allowed (syntax errors are permitted there),
    // so the blocks-only conflict gate never runs.
    const { rejected } = insert('1', 1, ')', false);
    expect(rejected).toBeUndefined();
});
