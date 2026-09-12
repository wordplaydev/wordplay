import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { kitExports } from '@nodes/publishedShare';
import { canPublishKit, checkKit, exportName } from './validateKit';

/**
 * What the publish dialog would say about a source, by conflict class.
 *
 * Asked of the source alone, deliberately: this is the *hypothetical* question, and it
 * has to answer before a project has ever published anything or a first kit could never
 * be checked. See `getShareConflicts`.
 */
function readiness(code: string) {
    const { empty, conflicts } = checkKit(new Source('colors', code));
    return [
        ...(empty ? ['empty'] : []),
        ...conflicts.map((c) => c.constructor.name),
    ];
}

const documented = `¶A warm colour. \\1\\¶\n↑ sunset/en: 1`;

test('a documented export publishes', () => {
    expect(readiness(documented)).toEqual([]);
});

test('a source that shares nothing has nothing to publish', () => {
    expect(readiness(`1 + 1`)).toContain('empty');
});

test('a kit may not borrow', () => {
    // No transitive dependencies in v1: version conflicts and cross-kit cycles are a
    // second design problem, and a kit that needs another can inline it.
    expect(readiness(`↓ @bo/other 1\n${documented}`)).toContain(
        'KitCannotBorrow',
    );
});

test('an export with no docs is refused', () => {
    // A kit is read by people who cannot ask its author.
    expect(readiness(`¶A kit. \\1\\¶\n1\n↑ sunset/en: 1`)).toContain(
        'UndocumentedShare',
    );
});

test('a shared function must show a worked example', () => {
    expect(
        readiness(`¶A kit. \\1\\¶\n1\n¶Doubles it.¶\n↑ ƒ double(n•#) n · 2`),
    ).toContain('UnexampledShare');
    expect(
        readiness(
            `¶A kit. \\1\\¶\n1\n¶Doubles it. \\double(2)\\¶\n↑ ƒ double(n•#) n · 2`,
        ),
    ).toEqual([]);
});

test('a shared bind needs no example, only docs', () => {
    expect(readiness(documented)).not.toContain('UnexampledShare');
});

test('a kit with no example anywhere has no preview', () => {
    // The colour palette this whole feature exists for: every export documented, none of
    // them callable, and nothing for the registry to draw.
    expect(readiness(`¶A palette.¶\n1\n¶Warm.¶\n↑ sunset/en: 1`)).toEqual([
        'UnexampledKit',
    ]);
});

test('a shared conversion is an export, and needs docs', () => {
    const source = new Source('units', `↑ → #kitty #cat ⬚ ÷ 2`);
    expect(kitExports(source)).toHaveLength(1);
    // A conversion has no name at all, so it reports as its own arrow.
    expect(exportName(kitExports(source)[0])).toContain('→');
    expect(readiness(`↑ → #kitty #cat ⬚ ÷ 2`)).toContain('UndocumentedShare');
});

test("a source's own doc documents its first export (#1374)", () => {
    // `parseProgram` takes every leading doc as the program's, so documentation written
    // for the first definition in a source lands one level up and that definition cannot
    // be documented at all. The words are there; only the node they hang from is wrong.
    const source = new Source('colors', documented);
    expect(kitExports(source)[0].docs.isEmpty()).toBe(true);
    expect(source.expression.docs?.docs).toHaveLength(1);
    expect(readiness(documented)).toEqual([]);
});

test('the fallback reaches only the first export', () => {
    // A second export has to carry its own doc, because it can.
    expect(
        readiness(`¶Only the first. \\1\\¶\n↑ a/en: 1\n↑ b/en: 2`),
    ).toContain('UndocumentedShare');
});

test('canPublishKit answers the whole checklist', () => {
    expect(canPublishKit(new Source('colors', documented))).toBe(true);
    expect(canPublishKit(new Source('colors', `1\n↑ sunset/en: 1`))).toBe(
        false,
    );
});
