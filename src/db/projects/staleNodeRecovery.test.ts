import DefaultLocale from '@locale/DefaultLocale';
import Doc from '@nodes/Doc';
import Reference from '@nodes/Reference';
import Source from '@nodes/Source';
import { expect, test, vi } from 'vitest';
import Project from './Project';

/**
 * A doc whose embedded `\…\` example names a bind — the shape that broke
 * example localization. Translating rewrites the reference inside the doc in one
 * pass and the doc's text in another, over nodes gathered before either ran.
 */
const code = `count: 1\n¶Adds \\count\\ things¶\ntotal: count + 2`;

function build() {
    const project = Project.make(
        null,
        'x',
        new Source('start', code),
        [],
        DefaultLocale,
    );
    const source = project.getMain();
    const doc = source.nodes().find((n): n is Doc => n instanceof Doc);
    const reference = source
        .nodes()
        .find(
            (n): n is Reference =>
                n instanceof Reference && n.getName() === 'count',
        );
    if (doc === undefined || reference === undefined)
        throw new Error('fixture did not parse as expected');
    return { project, source, doc, reference };
}

test('replacing a node orphans the ancestors collected before it', () => {
    // Nodes are immutable, so replacing the reference rebuilds every ancestor —
    // including the Doc that contains it. This is the trap: the Doc object a
    // caller gathered up front is no longer the one in the tree.
    const { project, doc, reference } = build();
    const revised = project.withRevisedNodes([
        [reference, Reference.make('cuenta')],
    ]);
    expect(project.getSourceOf(doc)).toBeDefined();
    expect(revised.getSourceOf(doc)).toBeUndefined();
});

test('a stale node is silently skipped, not reported to the caller', () => {
    // Why this went unnoticed: withRevisedNodes logs to the console and drops
    // the replacement, and its return value looks like any other success.
    const { project, doc, reference } = build();
    const revised = project.withRevisedNodes([
        [reference, Reference.make('cuenta')],
    ]);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const again = revised.withRevisedNodes([[doc, Doc.make([])]]);
    const complained = errors.mock.calls.some((call) =>
        String(call[0]).includes("Couldn't find source of node being replaced"),
    );
    errors.mockRestore();
    expect(complained).toBe(true);
    expect(again.getMain().toWordplay()).toBe(revised.getMain().toWordplay());
});

test('the structural path recovers the rebuilt node, keeping the earlier change', () => {
    // What `current()` in translateProjectContent relies on: the path to the Doc
    // still resolves, and what it resolves to carries the reference rewrite.
    const { project, source, doc, reference } = build();
    const path = source.root.getPath(doc);
    const revised = project.withRevisedNodes([
        [reference, Reference.make('cuenta')],
    ]);
    const recovered = revised.resolvePath(0, path);
    expect(recovered).toBeInstanceOf(Doc);
    expect(revised.getSourceOf(recovered!)).toBeDefined();
    expect(recovered?.toWordplay()).toContain('cuenta');
});

test('a replacement using the recovered node actually applies', () => {
    const { project, source, doc, reference } = build();
    const path = source.root.getPath(doc);
    const revised = project.withRevisedNodes([
        [reference, Reference.make('cuenta')],
    ]);
    const recovered = revised.resolvePath(0, path);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const again = revised.withRevisedNodes([[recovered!, Doc.make([])]]);
    const complained = errors.mock.calls.some((call) =>
        String(call[0]).includes("Couldn't find source of node being replaced"),
    );
    errors.mockRestore();
    expect(complained).toBe(false);
    expect(again.getMain().toWordplay()).not.toBe(
        revised.getMain().toWordplay(),
    );
});
