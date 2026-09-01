import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';
import Caret from '@edit/caret/Caret';
import {
    referenceLabel,
    referenceTargetOf,
    resolveReference,
    type ResolvedReference,
} from '@db/chats/codeReference';

function projectWith(code: string) {
    return Project.make(
        null,
        'test',
        new Source('main', code),
        [],
        DefaultLocale,
    );
}

/** A reference to whatever node in `code` serializes exactly as `target`. */
function referenceTo(code: string, target: string) {
    const project = projectWith(code);
    const source = project.getMain();
    // `toWordplay()` on a node alone carries no whitespace, which is the form
    // a reference stores and compares against.
    const node = source.nodes().find((n) => n.toWordplay() === target);
    if (node === undefined) throw new Error(`no node reads "${target}"`);
    return {
        source: 0,
        path: source.root.getPath(node),
        code: node.toWordplay(),
    };
}

function stateOf(resolved: ResolvedReference) {
    return resolved.state;
}

describe('resolveReference', () => {
    test('finds the code it was made against', () => {
        const code = 'a: 1\nb: 2\nc: 3';
        const reference = referenceTo(code, 'b:2');
        const resolved = resolveReference(projectWith(code), reference);
        expect(stateOf(resolved)).toBe('valid');
        if (resolved.state !== 'valid') return;
        expect(resolved.node.toWordplay()).toBe('b:2');
        expect(resolved.firstLine).toBe(2);
        expect(resolved.lastLine).toBe(2);
    });

    test('follows the code when a line is added above it', () => {
        // The whole point. A Path is parent descriptors and child *indices*, so
        // inserting above shifts every later index and the path now resolves to
        // a different statement. Believing it would move the reference onto
        // someone else's code silently, which is worse than losing it.
        const reference = referenceTo('a: 1\nb: 2\nc: 3', 'b:2');
        const resolved = resolveReference(
            projectWith('zero: 0\na: 1\nb: 2\nc: 3'),
            reference,
        );
        expect(stateOf(resolved)).toBe('valid');
        if (resolved.state !== 'valid') return;
        expect(resolved.node.toWordplay()).toBe('b:2');
        // And the label follows the code rather than repeating what was stored.
        expect(resolved.firstLine).toBe(3);
    });

    test('goes stale when the code it named is gone', () => {
        const reference = referenceTo('a: 1\nb: 2\nc: 3', 'b:2');
        expect(
            stateOf(resolveReference(projectWith('a: 1\nc: 3'), reference)),
        ).toBe('invalid');
    });

    test('goes stale rather than guessing between two identical lines', () => {
        // Re-anchoring by text is only evidence when there is one candidate.
        // The path here lands on `x: 9`, so the text check rejects it and the
        // search takes over — and finds two `b: 2` in different places, which
        // is no answer at all.
        const reference = referenceTo('a: 1\nb: 2', 'b:2');
        expect(
            stateOf(
                resolveReference(
                    projectWith('a: 1\nx: 9\nb: 2\nb: 2'),
                    reference,
                ),
            ),
        ).toBe('invalid');
    });

    test('re-anchors when the line moved and there is only one of it', () => {
        // The other side of the same rule: the path is wrong but the code is
        // unmistakably still there, so the reference follows it.
        const reference = referenceTo('a: 1\nb: 2', 'b:2');
        const resolved = resolveReference(
            projectWith('a: 1\nx: 9\ny: 8\nb: 2'),
            reference,
        );
        expect(stateOf(resolved)).toBe('valid');
        if (resolved.state !== 'valid') return;
        expect(resolved.firstLine).toBe(4);
    });

    test('goes stale when the source it named is gone', () => {
        const reference = referenceTo('a: 1', 'a:1');
        expect(
            stateOf(
                resolveReference(projectWith('a: 1'), {
                    ...reference,
                    source: 7,
                }),
            ),
        ).toBe('invalid');
    });

    test('spans the lines of code that spans lines', () => {
        const code = 'a: 1\nƒ f() (\n    1\n)\nb: 2';
        const project = projectWith(code);
        const source = project.getMain();
        const definition = source
            .nodes()
            .find((n) => n.toWordplay().startsWith('ƒf()'));
        if (definition === undefined) throw new Error('no function');
        const resolved = resolveReference(project, {
            source: 0,
            path: source.root.getPath(definition),
            code: definition.toWordplay(),
        });
        expect(stateOf(resolved)).toBe('valid');
        if (resolved.state !== 'valid') return;
        expect(resolved.firstLine).toBe(2);
        expect(resolved.lastLine).toBe(4);
    });
});

describe('referenceTargetOf', () => {
    function caretAt(code: string, position: number | [number, number]) {
        return new Caret(
            new Source('main', code),
            position,
            undefined,
            undefined,
        );
    }

    test('a selected node is what is referred to', () => {
        const source = new Source('main', 'a: 1\nb: 2');
        const bind = source.nodes().find((n) => n.toWordplay() === 'b:2');
        if (bind === undefined) throw new Error('no bind');
        const caret = new Caret(source, bind, undefined, undefined);
        expect(referenceTargetOf(caret)).toBe(bind);
    });

    test('a range refers to the smallest thing that covers all of it', () => {
        // Selecting "1 + 2" inside "a: 1 + 2" is the sum, not the whole bind
        // and not the "1".
        const code = 'a: 1 + 2';
        const target = referenceTargetOf(caretAt(code, [3, 8]));
        expect(target?.toWordplay()).toBe('1+2');
    });

    test('a caret in the middle of a line refers to the line', () => {
        // The commonest thing anyone does: click, then press the button. The
        // caret at index 5 is on the `+`, and referring to an operator would be
        // no use to anyone.
        expect(referenceTargetOf(caretAt('a: 1 + 2', 5))?.toWordplay()).toBe(
            'a:1+2',
        );
    });

    test('a caret inside a function refers to the line, not the function', () => {
        // Climbing stops at the block, so a click in a body says which line.
        const code = 'ƒ f() (\n    a: 1\n    b: 2\n)';
        expect(
            referenceTargetOf(
                caretAt(code, code.indexOf('b: 2') + 1),
            )?.toWordplay(),
        ).toBe('b:2');
    });
});

describe('referenceLabel', () => {
    test('one line reads as one line, a run as a run', () => {
        // The word, not "L4": a learner has no reason to know that shorthand.
        expect(referenceLabel(DefaultLocales, 4, 4)).toBe('line 4');
        expect(referenceLabel(DefaultLocales, 3, 5)).toBe('lines 3–5');
    });
});
