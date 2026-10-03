import Project from '#db/projects/Project.ts';
import DefaultLocale from '#locale/DefaultLocale.ts';
import Source from '#nodes/Source.ts';
import { expect, test } from 'vitest';
import describeRestore, {
    changedSourceSpan,
    previewSpan,
} from './describeRestore.ts';

function versions(before: string, after: string) {
    const source = new Source('test', before);
    const from = Project.make(null, 'test', source, [], DefaultLocale);
    const to = from.withSource(source, source.withCode(after));
    const locales = from.getContext(source).getBasis().locales;
    return { from, to, locales };
}

test('an undo names the code that came back and the code that is gone', () => {
    const { from, to, locales } = versions('1 + 2 + 3', '1 + 2');
    const said = describeRestore(from, to, -1, locales);
    expect(said).toContain('+ 3');
    expect(said.toLowerCase()).toContain('undone');
});

test('a redo is worded as a redo', () => {
    const { from, to, locales } = versions('1', '1 + 2');
    expect(describeRestore(from, to, 1, locales).toLowerCase()).toContain(
        'redone',
    );
});

test('two undos of different edits are heard as two announcements', () => {
    // The queued lane drops a repeat of identical text, so a bare "undone"
    // would be heard once and then sound broken.
    const first = versions('1 + 2', '1');
    const second = versions('"hello"', '""');
    expect(
        describeRestore(first.from, first.to, -1, first.locales),
    ).not.toEqual(describeRestore(second.from, second.to, -1, second.locales));
});

test('an undo that changes no code still says it happened', () => {
    const { from, locales } = versions('1', '1');
    const said = describeRestore(from, from, -1, locales);
    expect(said.length).toBeGreaterThan(0);
    expect(said).not.toContain('undefined');
});

test('a long span is previewed and whitespace collapsed', () => {
    const preview = previewSpan('a\n\n    b' + 'x'.repeat(100));
    expect(preview).toMatch(/^a b/);
    expect(preview.endsWith('…')).toBe(true);
    expect(preview.length).toBeLessThan(50);
});

test('undoing the same character twice reads the same, and says nothing invented', () => {
    // Nothing differs between the two but where the caret lands, which the
    // editor adds. The announcer lets the repeat through (see the `edit` and
    // `restore` kinds) rather than this numbering a history nobody can see.
    const first = versions('111', '11');
    const second = versions('11', '1');
    const a = describeRestore(first.from, first.to, -1, first.locales);
    expect(a).toEqual(
        describeRestore(second.from, second.to, -1, second.locales),
    );
    expect(a).not.toMatch(/step/i);
});

test('the changed source is named by its position', () => {
    const { from, to } = versions('1 + 2', '1');
    expect(changedSourceSpan(from, to)?.source).toBe(0);
    expect(changedSourceSpan(from, from)).toBeUndefined();
});
