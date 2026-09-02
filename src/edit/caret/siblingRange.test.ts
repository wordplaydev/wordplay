import {
    getSiblingRange,
    nodesInRange,
    rangeIsRemovable,
    siblingOf,
    withoutRun,
} from '@edit/caret/siblingRange';
import Block from '@nodes/Block';
import ListLiteral from '@nodes/ListLiteral';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';

/** The statements of a program's root block, which is the commonest run. */
function statements(source: Source) {
    const block = source
        .nodes()
        .find((n): n is Block => n instanceof Block && n.isRoot());
    if (block === undefined) throw new Error('no root block');
    return block.statements;
}

function values(source: Source) {
    const list = source
        .nodes()
        .find((n): n is ListLiteral => n instanceof ListLiteral);
    if (list === undefined) throw new Error('no list literal');
    return list.values;
}

test('two statements of one block are a range, in document order', () => {
    const source = new Source('test', '1\n2\n3');
    const [one, two, three] = statements(source);
    const range = getSiblingRange(source.root, three, one);
    expect(range).toBeDefined();
    // Given out of order, the range still runs first to last.
    expect(nodesInRange(range!)).toEqual([one, two, three]);
    expect(range!.field).toBe('statements');
});

test('nodes in different parents are not a range', () => {
    const source = new Source('test', '[1 2]\n[3 4]');
    const lists = source.nodes().filter((n) => n instanceof ListLiteral);
    const range = getSiblingRange(
        source.root,
        (lists[0] as ListLiteral).values[0],
        (lists[1] as ListLiteral).values[0],
    );
    expect(range).toBeUndefined();
});

test('a node not in a list field is not a range', () => {
    // A binary evaluate's operands are single-valued fields, not a list.
    const source = new Source('test', '1 + 2');
    const nodes = source.nodes();
    const numbers = nodes.filter((n) => n.toWordplay().trim() === '1');
    const others = nodes.filter((n) => n.toWordplay().trim() === '2');
    expect(getSiblingRange(source.root, numbers[0], others[0])).toBeUndefined();
});

test('siblingOf walks the list and stops at its ends', () => {
    const source = new Source('test', '1\n2\n3');
    const [one, two, three] = statements(source);
    expect(siblingOf(source.root, one, 1)).toBe(two);
    expect(siblingOf(source.root, two, 1)).toBe(three);
    expect(siblingOf(source.root, three, 1)).toBeUndefined();
    expect(siblingOf(source.root, one, -1)).toBeUndefined();
});

test('removing a run of statements closes the gap to one line break', () => {
    const source = new Source('test', '1\n2\n3\n4');
    const [, two, three] = statements(source);
    const range = getSiblingRange(source.root, two, three)!;
    const revised = withoutRun(source, range);
    // Removing each node separately would concatenate their leading spaces onto
    // the survivor, leaving blank lines that formatting never takes back.
    expect(revised?.source.getCode().toString()).toBe('1\n4');
    // And the caret lands at the end of what preceded the run, measured in the
    // new source rather than at the run's now-stale old index.
    expect(revised?.position).toBe(1);
});

test('removing a run of inline values keeps the list on one line', () => {
    const source = new Source('test', '[1 2 3 4]');
    const [, two, three] = values(source);
    const range = getSiblingRange(source.root, two, three)!;
    expect(withoutRun(source, range)?.source.getCode().toString()).toBe(
        '[1 4]',
    );
});

test('removing a run at the start of a list leaves no leading space', () => {
    const source = new Source('test', '[1 2 3]');
    const [one, two] = values(source);
    const range = getSiblingRange(source.root, one, two)!;
    expect(withoutRun(source, range)?.source.getCode().toString()).toBe('[3]');
});

test('removing a run at the end of a list leaves the survivors alone', () => {
    const source = new Source('test', '[1 2 3]');
    const [, two, three] = values(source);
    const range = getSiblingRange(source.root, two, three)!;
    expect(withoutRun(source, range)?.source.getCode().toString()).toBe('[1]');
});

test('a list that may be empty permits removing all of it', () => {
    const source = new Source('test', '[1 2]');
    const [one, two] = values(source);
    const range = getSiblingRange(source.root, one, two)!;
    expect(rangeIsRemovable(range)).toBe(true);
    expect(withoutRun(source, range)?.source.getCode().toString()).toBe('[]');
});
