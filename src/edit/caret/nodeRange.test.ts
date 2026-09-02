import Project from '@db/projects/Project';
import Caret from '@edit/caret/Caret';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Block from '@nodes/Block';
import ListLiteral from '@nodes/ListLiteral';
import type Node from '@nodes/Node';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

function setup(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const block = source
        .nodes()
        .find((n): n is Block => n instanceof Block && n.isRoot());
    if (block === undefined) throw new Error('no root block');
    return { source, project, statements: block.statements };
}

/** A caret selecting one node, from which shift+arrow extends. */
function on(source: Source, node: Node) {
    return new Caret(source, node, undefined, undefined);
}

test('extending selects a run, and coming back collapses it', () => {
    const { source, statements } = setup('1\n2\n3');
    const [one, two] = statements;

    const caret = on(source, one);
    expect(caret.getSelectedNodes()).toEqual([one]);
    expect(caret.isRangeOfNodes()).toBe(false);

    const extended = caret.expandNode(1);
    expect(extended).toBeInstanceOf(Caret);
    const run = extended as Caret;
    expect(run.getSelectedNodes()).toEqual([one, two]);
    expect(run.isRangeOfNodes()).toBe(true);

    // Moving the focus back onto the anchor collapses rather than leaving a
    // one-node "range", so a selection and a plain node position never differ.
    const collapsed = run.expandNode(-1) as Caret;
    expect(collapsed.isRangeOfNodes()).toBe(false);
    expect(collapsed.getSelectedNodes()).toEqual([one]);
});

test('extending refuses at the end of the list rather than doing nothing', () => {
    const { source, statements } = setup('1\n2');
    const result = on(source, statements[1]).expandNode(1);
    // A refusal is a locale accessor, which the editor speaks.
    expect(result).toBeTypeOf('function');
});

test('repositioning collapses a selection', () => {
    const { source, statements } = setup('1\n2\n3');
    const run = on(source, statements[0]).expandNode(1) as Caret;
    expect(run.isRangeOfNodes()).toBe(true);
    // withPosition is what nearly every command uses, so this is the property
    // that keeps a stale selection from surviving an unrelated move.
    expect(run.withPosition(statements[2]).isRangeOfNodes()).toBe(false);
    expect(run.withPosition(0).isRangeOfNodes()).toBe(false);
});

test('a selection cannot span nodes that are not siblings in one list', () => {
    const { source, statements } = setup('[1 2]\n3');
    // The list's first value and the program's second statement share no list.
    const list = statements[0];
    const value = list.getChildren()[1];
    expect(on(source, value).withRange(statements[1]).isRangeOfNodes()).toBe(
        false,
    );
});

test('deleting a selection removes the whole run in one edit', () => {
    const { source, project, statements } = setup('1\n2\n3\n4');
    const run = on(source, statements[1]).expandNode(1) as Caret;
    const edit = run.delete(project, false, false);
    expect(Array.isArray(edit)).toBe(true);
    const [newSource] = edit as [Source, Caret];
    expect(newSource.getCode().toString()).toBe('1\n4');
});

test('deleting a selection is refused when the list may not be emptied', () => {
    // A nested block's statements may not all go — unlike a root block's, whose
    // field allows empty because an empty program is legitimate.
    const { source, project } = setup('(1\n2)\n3');
    const nested = source
        .nodes()
        .find((n): n is Block => n instanceof Block && !n.isRoot());
    const run = on(source, nested!.statements[0]).expandNode(1) as Caret;
    expect(run.delete(project, false, false)).toBeTypeOf('function');
});

test('deleting a selection of inline values leaves the list on one line', () => {
    const { source, project } = setup('[1 2 3]');
    const list = source
        .nodes()
        .find((n): n is ListLiteral => n instanceof ListLiteral);
    const run = on(source, list!.values[0]).expandNode(1) as Caret;
    const [newSource] = run.delete(project, false, false) as [Source, Caret];
    expect(newSource.getCode().toString()).toBe('[3]');
});

test('wrapping a selection of inline values puts one container around them', () => {
    const { source, project } = setup('[1 2 3]');
    const list = source
        .nodes()
        .find((n): n is ListLiteral => n instanceof ListLiteral);
    const run = on(source, list!.values[0]).expandNode(1) as Caret;
    expect(
        (run.wrap(project, '[') as [Source, Caret])[0].getCode().toString(),
    ).toBe('[[1 2] 3]');
    expect(
        (run.wrap(project, '{') as [Source, Caret])[0].getCode().toString(),
    ).toBe('[{1 2} 3]');
});

test('wrapping a run of statements keeps the lines the creator wrote', () => {
    const { source, project, statements } = setup('1\n2\n3');
    const run = on(source, statements[0]).expandNode(1) as Caret;
    // The run was on its own lines, so the container is too — formatting only
    // ever adds line breaks, and preserving the layout is the right outcome.
    expect(
        (run.wrap(project, '(') as [Source, Caret])[0].getCode().toString(),
    ).toBe('(\n\t1\n\t2)\n3');
});

test('an operator declines to wrap a selection, since it takes one operand', () => {
    const { source, project, statements } = setup('1\n2\n3');
    const run = on(source, statements[0]).expandNode(1) as Caret;
    expect(run.wrap(project, '+')).toBeUndefined();
});

test('a selection spans exactly the text between its ends', () => {
    const { source, statements } = setup('1\n2\n3');
    const run = on(source, statements[0]).expandNode(1) as Caret;
    const span = run.getSelectionSpan();
    expect(span).toBeDefined();
    expect(source.getGraphemesBetween(span![0], span![1]).toString()).toBe(
        '1\n2',
    );
});

test('two selections of the same size are described differently', () => {
    // A count alone would be the same words every time, so the announcement
    // would be heard once and then sound broken. Assert that it varies.
    const { source, project, statements } = setup('1\n2\n3\n4');
    const context = project.getContext(source);
    const first = (
        on(source, statements[0]).expandNode(1) as Caret
    ).getPositionDescription(undefined, context);
    const second = (
        on(source, statements[2]).expandNode(1) as Caret
    ).getPositionDescription(undefined, context);
    expect(first).not.toBe(second);
    // And both should say how many, in the reader's language.
    expect(first).toContain('2');
    expect(DefaultLocales.getLocales().length).toBeGreaterThan(0);
});
