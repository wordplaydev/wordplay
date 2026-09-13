import type Conflict from '@conflicts/Conflict';
import UndocumentedShare from '@conflicts/UndocumentedShare';
import UnexampledKit from '@conflicts/UnexampledKit';
import UnexampledShare from '@conflicts/UnexampledShare';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import { expect, test } from 'vitest';
import { kitExamples, kitExports } from './publishedShare';

/** A project that publishes its only source, which is when these conflicts apply. */
function published(code: string, supplement?: string) {
    const source = new Source('colors', code);
    const extra =
        supplement === undefined ? [] : [new Source('extra', supplement)];
    return Project.make(null, 'test', source, extra, DefaultLocale).withKitID(
        'a-kit',
    );
}

function names(conflicts: Conflict[]) {
    return conflicts.map((c) => c.constructor.name).sort();
}

function conflictsIn(code: string) {
    return names(published(code).analyze().conflicts);
}

const documented = `¶A warm colour. \\1\\¶\n↑ sunset/en: 1`;

test('a documented, exampled kit has nothing to say', () => {
    expect(conflictsIn(documented)).toEqual([]);
});

test('an undocumented share in a published source conflicts', () => {
    // The `↑` is what makes it someone else's to read.
    expect(conflictsIn(`¶Anything. \\1\\¶\n\n↑ sunset/en: 1`)).toContain(
        'UndocumentedShare',
    );
});

test('the same code in an unpublished source does not', () => {
    // `↑` also means "share with my own other sources", where demanding an explanation
    // for strangers would be noise. Same source, same code, no kit.
    const source = new Source('colors', `↑ sunset/en: 1`);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(project.getKitID()).toBeNull();
    expect(names(project.analyze().conflicts)).not.toContain(
        'UndocumentedShare',
    );
});

test('only the published source is held to it', () => {
    // A two-source project publishes one of them; the other keeps sharing freely.
    const project = published(documented, `↑ other/en: 2`);
    expect(names(project.analyze().conflicts)).toEqual([]);
});

test('a doc touching the first export documents it (#1374)', () => {
    // The first export used to be the one thing in a source nobody could document: every
    // leading doc was taken as the program's. A doc adjacent to what it explains now
    // documents it, like every other doc.
    const source = new Source('colors', documented);
    expect(kitExports(source)[0].docs.isEmpty()).toBe(false);
    expect(source.expression.docs.isEmpty()).toBe(true);
    expect(conflictsIn(documented)).toEqual([]);
});

test('each export carries its own doc', () => {
    // A doc reaches the export it touches and no further.
    expect(
        conflictsIn(`¶Only the first. \\1\\¶\n↑ a/en: 1\n↑ b/en: 2`),
    ).toEqual(['UndocumentedShare']);
});

// A blank line makes the first doc the source's own rather than the first definition's
// (#1374), so each of these tests the definition's own doc. The source's doc carries the
// example that keeps UnexampledKit quiet.
const preamble = `¶A kit. \\1\\¶\n\n`;

test('a callable share must show a worked example', () => {
    expect(
        conflictsIn(`${preamble}¶Doubles it.¶\n↑ ƒ double(n•#) n · 2`),
    ).toEqual(['UnexampledShare']);
    expect(
        conflictsIn(
            `${preamble}¶Doubles it. \\double(2)\\¶\n↑ ƒ double(n•#) n · 2`,
        ),
    ).toEqual([]);
});

test('a shared structure must show a worked example', () => {
    expect(
        conflictsIn(`${preamble}¶A pair.¶\n↑ •Pair/en(a/en•# b/en•#)`),
    ).toContain('UnexampledShare');
});

test('a shared conversion must show a worked example', () => {
    expect(
        conflictsIn(`${preamble}¶Halves it.¶\n↑ → #kitty #cat ⬚ ÷ 2`),
    ).toEqual(['UnexampledShare']);
});

test('a shared bind needs docs but no example of its own', () => {
    // A value shows what it is; a thing you call does not. The source's doc carries the
    // example, so the kit still has a preview.
    expect(conflictsIn(`¶Warm. \\1\\¶\n\n↑ sunset/en: 1`)).toContain(
        'UndocumentedShare',
    );
    expect(
        conflictsIn(`¶Warm. \\1\\¶\n\n¶A warm colour.¶\n↑ sunset/en: 1`),
    ).toEqual([]);
});

test('a static share inside a structure is not an export', () => {
    // The "static" interpretation never crosses a source boundary, let alone a project's,
    // so the undocumented `↑ zero` inside the structure is nobody else's to read.
    expect(
        conflictsIn(
            `${preamble}¶A pair. \\Pair(1 2)\\¶\n↑ •Pair/en(a/en•# b/en•#) (↑ zero/en: 0)`,
        ),
    ).not.toContain('UndocumentedShare');
});

test('Program raises UnexampledKit when a published source has no example anywhere', () => {
    // Every export documented, none of them callable, and not one `\…\` in the file —
    // which is exactly a colour palette, the case this whole feature exists for.
    expect(conflictsIn(`¶A palette.¶\n\n¶Warm.¶\n↑ sunset/en: 1`)).toEqual([
        'UnexampledKit',
    ]);
});

test('an unpublished source with no example raises no UnexampledKit from Program', () => {
    const source = new Source(
        'colors',
        `¶A palette.¶\n\n¶Warm.¶\n↑ sunset/en: 1`,
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    expect(names(project.analyze().conflicts)).toEqual([]);
});

test("kitExamples prefers the source's own doc, then each export's", () => {
    const source = new Source(
        'colors',
        `¶A palette. \\1\\¶\n\n¶Warm. \\2\\¶\n↑ sunset/en: 1`,
    );
    const found = kitExamples(source);
    expect(found).toHaveLength(2);
    expect(found[0].toWordplay()).toContain('1');
    expect(found[1].toWordplay()).toContain('2');
});

test("an export's example counts when the source has no doc of its own", () => {
    // A kit whose whole documentation is one doc on one export still has a preview.
    expect(kitExamples(new Source('colors', documented))).toHaveLength(1);
});

test('every publishing conflict offers a way out of publishing', () => {
    // A conflict can't stop a project publishing — a repair's mediator is synchronous
    // and has no database — so each points at the dialog that can.
    const project = published(`1\n↑ sunset/en: 1`);
    const source = project.getMain();
    const context = project.getContext(source);
    const found = project
        .analyze()
        .conflicts.filter(
            (c) =>
                c instanceof UndocumentedShare ||
                c instanceof UnexampledShare ||
                c instanceof UnexampledKit,
        );
    expect(found.length).toBeGreaterThan(0);
    for (const conflict of found) {
        expect(conflict.isMinor()).toBe(true);
        const [resolution] = conflict.getResolutions(context, []);
        expect(resolution.kind).toBe('explain');
        expect(
            resolution.kind === 'explain' ? resolution.openDialog : undefined,
        ).toBe('share');
    }
});

test("a source's own doc can name what the source defines (#1374)", () => {
    // The whole design of §4 asks a kit author to put the headline example in the
    // source's doc — separated by a blank line, which is what makes it the source's —
    // and nothing the source defines used to be in scope there. So the most natural
    // thing anyone can write, an example calling the thing the doc explains, reported
    // UnknownName with no workaround available.
    expect(
        conflictsIn(`¶Warm. \\sunset\\⭐¶\n\n¶A warm colour.¶\n↑ sunset/en: 1`),
    ).toEqual([]);
});

test('a program doc still cannot name something nothing defines', () => {
    // Widened scope, not abandoned scope.
    expect(
        conflictsIn(`¶Warm. \\nope\\¶\n\n¶A warm colour.¶\n↑ sunset/en: 1`),
    ).toContain('UnknownName');
});
