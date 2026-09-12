import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import { findConceptEntry } from '@locale/getConceptName';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import kitKinds, { MAX_KINDS } from './kitKinds';

/** What the registry would file a source under. */
function kinds(code: string): string[] {
    const source = new Source('colors', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return kitKinds(source, project.getContext(source));
}

test('a shared colour is a colour kit', () => {
    // The case the whole feature exists for: nothing in the name says "colour".
    expect(
        kinds('¶A warm colour. \\1\\¶\n↑ sunset/en: 🌈(50% 30 20°)'),
    ).toEqual(['Color']);
});

test('a palette of colours is still a colour kit', () => {
    // The recursion earns its keep here. A list that yielded only `List` would leave the
    // palette kit out of the one filter anybody would look for it in.
    expect(
        kinds(
            '¶A palette. \\1\\¶\n↑ sunset/en: [🌈(50% 30 20°) 🌈(90% 30 20°)]',
        ),
    ).toEqual(['Color', 'List']);
});

test('a function is filed under what it returns, not what it takes', () => {
    expect(
        kinds(
            '¶Fades it. \\1\\¶\n↑ ƒ fade/en(c•🌈) 🌈(c.lightness ÷ 2 c.chroma c.hue)',
        ),
    ).toEqual(['Color']);
});

test('a number is a number, not a measurement', () => {
    // The one runtime name that disagrees with its concept id.
    expect(kinds('¶Pi. \\1\\¶\n↑ pi/en: 3.14159')).toEqual(['Number']);
});

test('a creator-defined structure is a new kind of thing', () => {
    expect(kinds("¶A cat. \\1\\¶\n↑ •Cat/en(name/en•'')")).toEqual([
        'Structure',
    ]);
});

test('an optional colour is a colour, not nothing', () => {
    expect(kinds('¶Maybe warm. \\1\\¶\n↑ sunset/en•🌈|ø: ø')).toEqual([
        'Color',
    ]);
});

test('a kit that shares only none says so', () => {
    expect(kinds('¶Nothing. \\1\\¶\n↑ nothing/en: ø')).toEqual(['None']);
});

test('two exports of one type are one kind', () => {
    expect(
        kinds(
            '¶Two colours. \\1\\¶\n↑ dawn/en: 🌈(50% 30 20°)\n↑ dusk/en: 🌈(90% 30 20°)',
        ),
    ).toEqual(['Color']);
});

test('a source that shares nothing is filed under nothing', () => {
    expect(kinds('¶Nothing shared.¶\n1')).toEqual([]);
});

test('kinds are sorted, so the trigger can compare them positionally', () => {
    const found = kinds(
        "¶Several. \\1\\¶\n↑ n/en: 1\n↑ t/en: 'hi'\n↑ c/en: 🌈(50% 30 20°)",
    );
    expect(found).toEqual([...found].sort());
    expect(found).toEqual(['Color', 'Number', 'Text']);
});

test('every kind a kit can claim is a concept a reader can be shown', () => {
    // The real risk isn't a wrong entry in a hand-written vocabulary list — it's a share
    // added later whose record key isn't a concept id. This walks them all, so that fails
    // here rather than as a blank filter label.
    const project = Project.make(
        null,
        'test',
        new Source('empty', '1'),
        [],
        DefaultLocale,
    );
    const shares = project.shares;
    const unresolvable = [
        ...Object.keys(shares.input),
        ...Object.keys(shares.output),
    ]
        // `Data` is the one share the locale files under a different name; `kitKinds`
        // carries that single override.
        .map((key) => (key === 'Data' ? 'Source' : key))
        .filter((id) => findConceptEntry(DefaultLocale, id) === undefined);
    expect(unresolvable).toEqual([]);
});

test('the kinds a kit claims are bounded', () => {
    expect(MAX_KINDS).toBeGreaterThan(0);
    const many = Array.from(
        { length: MAX_KINDS + 5 },
        (_, i) => `¶Doc ${i}. \\1\\¶\n↑ v${i}/en: •Thing${i}()`,
    ).join('\n');
    expect(kinds(many).length).toBeLessThanOrEqual(MAX_KINDS);
});
