import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import {
    defaultFolds,
    FOLD_BY_DEFAULT_ITEMS,
    isFoldableNode,
} from '@components/editor/util/folding';
import Doc from '@nodes/Doc';
import Docs from '@nodes/Docs';
import FunctionDefinition from '@nodes/FunctionDefinition';
import ListLiteral from '@nodes/ListLiteral';
import type Node from '@nodes/Node';

function main(code: string) {
    return Project.make(
        null,
        't',
        new Source('t', code),
        [],
        DefaultLocale,
    ).getMain();
}

function folds(code: string) {
    return defaultFolds(main(code).expression);
}

/** The first node of the given type, for asking whether it folds. */
function find<NodeType extends Node>(
    source: Source,
    type: new (...args: never[]) => NodeType,
): NodeType {
    const found = source
        .nodes()
        .find((node): node is NodeType => node instanceof type);
    if (found === undefined) throw new Error(`expected a ${type.name}`);
    return found;
}

test('an ordinary list arrives open', () => {
    // A creator's own handful of things must stay visible; folding is for
    // collections nobody reads item by item.
    expect(folds(`[1 2 3 4 5]`)).toHaveLength(0);
    const justUnder = Array.from(
        { length: FOLD_BY_DEFAULT_ITEMS - 1 },
        (_, i) => i,
    ).join(' ');
    expect(folds(`[${justUnder}]`)).toHaveLength(0);
});

test('a long list arrives folded', () => {
    const many = Array.from(
        { length: FOLD_BY_DEFAULT_ITEMS },
        (_, i) => i,
    ).join(' ');
    const found = folds(`[${many}]`);
    expect(found).toHaveLength(1);
    expect(found[0]).toBeInstanceOf(ListLiteral);
});

test('an imported track folds its notes but not its music', () => {
    // The shape a MIDI import writes: the note list is long, the list of track
    // names is not, so only the notes close.
    const notes = Array.from({ length: 80 }, (_, i) => (i % 8) + 1).join(' ');
    const found = folds(`track1: Track([${notes}])\nMusic([track1])`);
    expect(found).toHaveLength(1);
    const list = found[0];
    if (!(list instanceof ListLiteral)) throw new Error('expected a list');
    expect(list.values).toHaveLength(80);
});

test('every long container folds, not only lists', () => {
    const many = Array.from({ length: 60 }, (_, i) => i).join(' ');
    expect(folds(`{${many}}`)).toHaveLength(1);
});

test('a long container arriving later is recognized as new', () => {
    // The bug this replaced: defaults only applied when a source had never
    // been folded, so a project opened once — which persists an empty fold set
    // — never folded anything again, and an imported song rendered whole.
    // What the editor actually asks is "which long containers weren't here
    // before", so the paths must differ between the two sources.
    const before = Project.make(
        null,
        't',
        new Source('t', `Phrase('hi')`),
        [],
        DefaultLocale,
    );
    const notes = Array.from({ length: 80 }, (_, i) => (i % 8) + 1).join(' ');
    const after = Project.make(
        null,
        't',
        new Source(
            't',
            `Phrase('hi')\ntrack1: Track([${notes}])\nMusic([track1])`,
        ),
        [],
        DefaultLocale,
    );

    const keyOf = (project: Project) =>
        new Set(
            defaultFolds(project.getMain().expression).map((node) =>
                JSON.stringify(project.getMain().root.getPath(node)),
            ),
        );

    const had = keyOf(before);
    const has = keyOf(after);
    expect(had.size).toBe(0);
    expect(has.size).toBe(1);
    // The arrival is new, so it folds.
    const arrived = [...has].filter((key) => !had.has(key));
    expect(arrived).toHaveLength(1);
});

test('a multi-line doc folds, but its list of translations does not', () => {
    // The fold has to be on the Doc: a Docs is a list of per-language
    // translations, so collapsing it to its first doc hid nothing at all, and
    // the control appeared to do nothing but rotate.
    const source = main(
        `¶Welcome to your blank project!\nIt supports *bold* and more.¶\nPhrase('hi')`,
    );
    expect(isFoldableNode(find(source, Doc), source.spaces)).toBe(true);
    expect(isFoldableNode(find(source, Docs), source.spaces)).toBe(false);
});

test('a single line doc does not fold', () => {
    // There'd be nothing to hide, so there's no control.
    const source = main(`¶One line.¶\nPhrase('hi')`);
    expect(isFoldableNode(find(source, Doc), source.spaces)).toBe(false);
});

test('a doc folds independently of the thing it documents', () => {
    // The doc spans lines and the function body doesn't, so only the doc offers
    // a control — isBodyFoldable skips the docs' leaves.
    const source = main(
        `x: 1\n¶Explains what this\ndoes across lines.¶\nƒ greet() 'hi'\ngreet()`,
    );
    const fun = find(source, FunctionDefinition);
    expect(isFoldableNode(fun.docs.docs[0], source.spaces)).toBe(true);
    expect(isFoldableNode(fun, source.spaces)).toBe(false);
});

test('a long container that was already there is not re-folded', () => {
    // Otherwise unfolding one by hand would be undone by the next keystroke.
    const notes = Array.from({ length: 80 }, (_, i) => (i % 8) + 1).join(' ');
    const code = `track1: Track([${notes}])\nMusic([track1])`;
    const keyOf = (source: string) => {
        const project = Project.make(
            null,
            't',
            new Source('t', source),
            [],
            DefaultLocale,
        );
        return new Set(
            defaultFolds(project.getMain().expression).map((node) =>
                JSON.stringify(project.getMain().root.getPath(node)),
            ),
        );
    };
    const had = keyOf(code);
    // An edit elsewhere leaves the track where it was.
    const has = keyOf(`${code}\nPhrase('hi')`);
    expect([...has].filter((key) => !had.has(key))).toHaveLength(0);
});
