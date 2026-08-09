import { expect, test } from 'vitest';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import DefaultLocale from '@locale/DefaultLocale';
import {
    defaultFolds,
    FOLD_BY_DEFAULT_ITEMS,
} from '@components/editor/util/folding';
import ListLiteral from '@nodes/ListLiteral';

function folds(code: string) {
    const project = Project.make(null, 't', new Source('t', code), [], DefaultLocale);
    return defaultFolds(project.getMain().expression);
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
    const many = Array.from({ length: FOLD_BY_DEFAULT_ITEMS }, (_, i) => i).join(
        ' ',
    );
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
        null, 't', new Source('t', `Phrase('hi')`), [], DefaultLocale,
    );
    const notes = Array.from({ length: 80 }, (_, i) => (i % 8) + 1).join(' ');
    const after = Project.make(
        null,
        't',
        new Source('t', `Phrase('hi')\ntrack1: Track([${notes}])\nMusic([track1])`),
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

test('a long container that was already there is not re-folded', () => {
    // Otherwise unfolding one by hand would be undone by the next keystroke.
    const notes = Array.from({ length: 80 }, (_, i) => (i % 8) + 1).join(' ');
    const code = `track1: Track([${notes}])\nMusic([track1])`;
    const keyOf = (source: string) => {
        const project = Project.make(
            null, 't', new Source('t', source), [], DefaultLocale,
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
