import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeEach, describe, expect, test } from 'vitest';
import { Revised } from '@locale/Annotations';
import type LocaleText from '@locale/LocaleText';
import { getKeyTemplatePairs } from '@util/verify-locales/LocalePath';
import checkStringArrays from '@util/verify-locales/checkStringArrays';
import { collectingLog } from '@util/verify-locales/Log';
import { getLocalePath } from '@util/verify-locales/LocaleSchema';
import type Tutorial from '../../tutorial/Tutorial';
import { TutorialModes } from '../../tutorial/TutorialMode';
import { getTutorialPath } from '@util/verify-locales/TutorialSchema';
import {
    changedBetween,
    driftSince,
    clearHistoryCache,
    collectValues,
    getCheckablePathKinds,
    getTranslatableTutorialPathKinds,
    compareFile,
    isMarkable,
    lastChangedTimes,
    markStale,
    withoutLeadingAnnotation,
    type Stale,
} from '@util/verify-locales/drift';

/** A throwaway git repo, so the history walk is tested against known history
 *  rather than this repo's, which grows every day. */
class Fixture {
    readonly dir: string;
    /** Commits are stamped a minute apart so ordering is unambiguous; git's
     *  second-resolution timestamps would otherwise tie within a fast test. */
    private minute = 0;

    constructor() {
        this.dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wordplay-drift-'));
        this.git('init', '--initial-branch=main');
        this.git('config', 'user.email', 'test@example.com');
        this.git('config', 'user.name', 'Test');
    }

    git(...args: string[]): string {
        const date = `2020-01-01T00:${String(this.minute).padStart(2, '0')}:00`;
        return execFileSync('git', args, {
            cwd: this.dir,
            encoding: 'utf8',
            env: {
                ...process.env,
                GIT_AUTHOR_DATE: date,
                GIT_COMMITTER_DATE: date,
            },
        });
    }

    /** Commit with an explicit date, for testing DAG-vs-date ordering. */
    commitAt(date: string, files: Record<string, unknown>): void {
        this.write(files);
        this.git('add', '-A');
        execFileSync('git', ['commit', '-m', 'change'], {
            cwd: this.dir,
            encoding: 'utf8',
            env: {
                ...process.env,
                GIT_AUTHOR_DATE: date,
                GIT_COMMITTER_DATE: date,
            },
        });
    }

    private write(files: Record<string, unknown>): void {
        for (const [file, content] of Object.entries(files)) {
            const full = path.join(this.dir, file);
            fs.mkdirSync(path.dirname(full), { recursive: true });
            fs.writeFileSync(
                full,
                typeof content === 'string'
                    ? content
                    : JSON.stringify(content, null, 4),
            );
        }
    }

    /** Write files and commit them as one change. */
    commit(files: Record<string, unknown>, message = 'change'): void {
        this.minute++;
        this.write(files);
        this.git('add', '-A');
        this.git('commit', '-m', message);
    }

    cleanup(): void {
        fs.rmSync(this.dir, { recursive: true, force: true });
    }
}

const fixtures: Fixture[] = [];
function makeFixture(): Fixture {
    const fixture = new Fixture();
    fixtures.push(fixture);
    return fixture;
}

beforeEach(() => clearHistoryCache());
afterAll(() => fixtures.forEach((fixture) => fixture.cleanup()));

/** Build the path → kind map the comparison takes, through the same filter
 *  production uses, so fixtures exercise the real exclusions. */
function kindsOf(text: Record<string, unknown>) {
    return getCheckablePathKinds(text as unknown as LocaleText);
}

describe('collectValues', () => {
    test('produces exactly the ids getKeyTemplatePairs produces', () => {
        // The walker exists to avoid allocating a LocalePath per pair per
        // version; this is what keeps it honest about path semantics.
        const source = JSON.parse(
            fs.readFileSync(getLocalePath('en-US'), 'utf8'),
        ) as LocaleText;
        const walked = [...collectValues(source).keys()].sort();
        const pairs = getKeyTemplatePairs(source)
            .map((pair) => pair.toString())
            .sort();
        expect(walked).toEqual(pairs);
    });

    test('treats a string array as one pair, not one per element', () => {
        const values = collectValues({ doc: ['a', 'b'], name: 'c' });
        expect([...values.keys()].sort()).toEqual(['.doc', '.name']);
    });

    test('indexes arrays of objects positionally, as LocalePath does', () => {
        const values = collectValues({ acts: [{ name: 'a' }, { name: 'b' }] });
        expect([...values.keys()]).toEqual(['acts.0.name', 'acts.1.name']);
    });

    test('ignores write-status markers so a marker change is not a content change', () => {
        expect(collectValues({ a: '$~hola' }).get('.a')).toEqual(
            collectValues({ a: 'hola' }).get('.a'),
        );
        expect(collectValues({ a: ['$!uno', 'dos'] }).get('.a')).toEqual(
            collectValues({ a: ['uno', 'dos'] }).get('.a'),
        );
    });
});

describe('withoutLeadingAnnotation', () => {
    test('strips exactly one leading marker and leaves other text alone', () => {
        expect(withoutLeadingAnnotation('$?a')).toBe('a');
        expect(withoutLeadingAnnotation('$!a')).toBe('a');
        expect(withoutLeadingAnnotation('$~a')).toBe('a');
        expect(withoutLeadingAnnotation('a$~b')).toBe('a$~b');
        expect(withoutLeadingAnnotation('$$a')).toBe('$$a');
    });
});

describe('lastChangedTimes', () => {
    test('dates each path by the commit that last changed its value', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one', b: 'two' } });
        fixture.commit({ 'en.json': { a: 'ONE', b: 'two' } });
        const changed = lastChangedTimes('en.json', fixture.dir);
        // `a` moved in the second commit; `b` never moved, so it dates to the
        // file's first appearance.
        expect(changed.get('.a')?.time).toBeGreaterThan(
            changed.get('.b')?.time ?? 0,
        );
        expect(changed.get('.a')?.previous).toBe(JSON.stringify('one'));
    });

    test('ignores reformatting', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' } });
        const before = lastChangedTimes('en.json', fixture.dir).get('.a')?.time;
        clearHistoryCache();
        fixture.commit({ 'en.json': '{"a":"one"}' });
        expect(lastChangedTimes('en.json', fixture.dir).get('.a')?.time).toBe(
            before,
        );
    });

    test('follows the file across renames', () => {
        const fixture = makeFixture();
        fixture.commit({ 'old/en.json': { a: 'one' } });
        const first = lastChangedTimes('old/en.json', fixture.dir).get(
            '.a',
        )?.time;
        clearHistoryCache();
        fixture.git('mv', 'old/en.json', 'en.json');
        fixture.commit({}, 'rename');
        // Without --follow the history would start at the rename and the value
        // would look brand new.
        expect(lastChangedTimes('en.json', fixture.dir).get('.a')?.time).toBe(
            first,
        );
    });
});

describe('compareFile', () => {
    /** Run a census inside a fixture, since the comparison reads files by
     *  relative path from the current directory. */
    function census(fixture: Fixture, source: string, target: string): Stale[] {
        clearHistoryCache();
        const read = (file: string) =>
            JSON.parse(fs.readFileSync(path.join(fixture.dir, file), 'utf8'));
        const sourceText = read(source);
        const targetText = read(target);
        return compareFile(
            'xx-XX',
            source,
            target,
            kindsOf(sourceText),
            sourceText,
            targetText,
            fixture.dir,
        );
    }

    test('flags a translation whose source moved after it did', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { a: 'one', b: 'two' },
            'xx.json': { a: 'uno', b: 'dos' },
        });
        fixture.commit({ 'en.json': { a: 'ONE', b: 'two' } });
        const stale = census(fixture, 'en.json', 'xx.json');
        expect(stale.map((entry) => entry.id)).toEqual(['.a']);
        expect(stale[0].english).toBe('ONE');
        expect(stale[0].translation).toBe('uno');
    });

    test('does not flag a translation updated in the same commit', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { a: 'one' },
            'xx.json': { a: 'uno' },
        });
        fixture.commit({
            'en.json': { a: 'ONE' },
            'xx.json': { a: 'UNO' },
        });
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('orders by topology, not by commit date', () => {
        // A translation written on a branch in January and merged in March
        // carries its January date, so date order would call it older than a
        // February en-US edit it actually postdates.
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: 'uno' } });
        fixture.git('checkout', '-b', 'side');
        fixture.commitAt('2020-01-01T00:10:00', { 'xx.json': { a: 'UNO' } });
        fixture.git('checkout', 'main');
        fixture.commitAt('2020-06-01T00:00:00', { 'en.json': { a: 'ONE' } });
        fixture.git('merge', 'side', '--no-edit');
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('counts an uncommitted translation as the newest change', () => {
        // The history walk only sees commits. Right after a translation run the
        // new text is on disk and not yet committed, and without this the census
        // would call every freshly translated string stale and re-queue it.
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: 'uno' } });
        fixture.commit({ 'en.json': { a: 'ONE' } });
        expect(census(fixture, 'en.json', 'xx.json').map((e) => e.id)).toEqual([
            '.a',
        ]);
        // Translate it, but don't commit.
        fs.writeFileSync(
            path.join(fixture.dir, 'xx.json'),
            JSON.stringify({ a: 'UNO' }, null, 4),
        );
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('a re-translation that changed nothing stays flagged', () => {
        // The limitation this tool cannot see past: value history proves a
        // translation *changed*, never that it was *checked*. If en-US is
        // reworded and the existing translation already reads correctly, a
        // re-translation writes the same bytes and leaves no trace, so it keeps
        // being reported. This is why the CI gate is scoped to drift a change
        // introduces (--since) rather than the absolute census, which would
        // otherwise stay red forever on this residue.
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'Define f' }, 'xx.json': { a: 'f' } });
        fixture.commit({ 'en.json': { a: 'f' } });
        expect(census(fixture, 'en.json', 'xx.json').map((e) => e.id)).toEqual([
            '.a',
        ]);
        // Re-translating produces the same bytes, so there is nothing to
        // commit at all — even an empty commit leaves the path attributed to
        // its old change.
        fixture.git('commit', '--allow-empty', '-m', 'no-op re-translation');
        expect(census(fixture, 'en.json', 'xx.json').map((e) => e.id)).toEqual([
            '.a',
        ]);
    });

    test('does not flag a translation updated after its source', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: 'uno' } });
        fixture.commit({ 'en.json': { a: 'ONE' } });
        fixture.commit({ 'xx.json': { a: 'UNO' } });
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('does not flag a translation that only gained a marker', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: 'uno' } });
        fixture.commit({ 'xx.json': { a: '$~uno' } });
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('skips a translation already queued for re-translation', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: '$!uno' } });
        fixture.commit({ 'en.json': { a: 'ONE' } });
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('ignores a path the source no longer has', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { a: 'one', gone: 'x' },
            'xx.json': { a: 'uno', gone: 'y' },
        });
        // en-US drops the key; the locale keeps its stale copy. The kinds map is
        // built from current en-US, so the dead path is not reported.
        fixture.commit({ 'en.json': { a: 'one' } });
        expect(census(fixture, 'en.json', 'xx.json')).toEqual([]);
    });

    test('reports a stale markup array once, not once per paragraph', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { doc: ['one', 'two'] },
            'xx.json': { doc: ['uno', 'dos'] },
        });
        fixture.commit({ 'en.json': { doc: ['ONE', 'two'] } });
        expect(census(fixture, 'en.json', 'xx.json').map((e) => e.id)).toEqual([
            '.doc',
        ]);
    });
});

describe('getTranslatableTutorialPathKinds', () => {
    test("covers a dialog line's text but never its concept or emotion", () => {
        // A Dialog is [concept, emotion, …text]; marking index 0 or 1 writes a
        // "$!" into a value the tutorial schema constrains to an enum.
        const tutorial = {
            acts: [
                {
                    title: 'Act',
                    scenes: [
                        {
                            title: 'Scene',
                            subtitle: 'Sub',
                            lines: [
                                ['Group', 'excited', 'Together now!', 'More.'],
                            ],
                        },
                    ],
                },
            ],
        } as unknown as Tutorial;
        const ids = [...getTranslatableTutorialPathKinds(tutorial).keys()];
        expect(ids).toContain('acts.0.scenes.0.lines.0.2');
        expect(ids).toContain('acts.0.scenes.0.lines.0.3');
        expect(ids).not.toContain('acts.0.scenes.0.lines.0.0');
        expect(ids).not.toContain('acts.0.scenes.0.lines.0.1');
    });
});

describe('changedBetween', () => {
    test('names en-US strings whose meaning changed, ignoring new keys', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one', b: 'two' } });
        fixture.commit({ 'en.json': { a: 'ONE', b: 'two', c: 'three' } });
        const text = { a: 'ONE', b: 'two', c: 'three' };
        const changes = changedBetween(
            'HEAD~1',
            'HEAD',
            'en.json',
            kindsOf(text),
            fixture.dir,
        );
        // `c` is new, so every locale gets it as `$?` — that is not drift.
        expect(changes.map((change) => change.id)).toEqual(['.a']);
        expect(changes[0].previous).toBe(JSON.stringify('one'));
        expect(changes[0].current).toBe(JSON.stringify('ONE'));
    });

    test('ignores a change that only adds a marker', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' } });
        fixture.commit({ 'en.json': { a: '$!one' } });
        expect(
            changedBetween(
                'HEAD~1',
                'HEAD',
                'en.json',
                kindsOf({ a: 'one' }),
                fixture.dir,
            ),
        ).toEqual([]);
    });

    test('reports nothing when a revision is missing', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' } });
        expect(
            changedBetween(
                'HEAD~1',
                'HEAD',
                'en.json',
                kindsOf({ a: 'one' }),
                fixture.dir,
            ),
        ).toEqual([]);
    });
});

/** A complete Stale entry, so tests can vary just the field under test. */
function staleEntry(fields: Partial<Stale> = {}): Stale {
    return {
        locale: 'xx-XX',
        file: 'xx.json',
        id: '.a',
        kind: 'plain',
        machine: false,
        source: { time: 2, order: 0, sha: 'b' },
        target: { time: 1, order: 1, sha: 'a' },
        english: 'one',
        translation: 'uno',
        ...fields,
    };
}

describe('driftSince', () => {
    /** Drift a working tree introduces relative to a base commit. */
    function since(fixture: Fixture, base: string) {
        clearHistoryCache();
        const source = JSON.parse(
            fs.readFileSync(path.join(fixture.dir, 'en.json'), 'utf8'),
        );
        return driftSince(
            base,
            'en.json',
            'xx.json',
            'xx-XX',
            kindsOf(source),
            fixture.dir,
        ).map((entry) => entry.id);
    }

    test('flags an en-US rewording whose translation was left behind', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { a: 'one', b: 'two' },
            'xx.json': { a: 'uno', b: 'dos' },
        });
        fs.writeFileSync(
            path.join(fixture.dir, 'en.json'),
            JSON.stringify({ a: 'ONE', b: 'two' }, null, 4),
        );
        expect(since(fixture, 'HEAD')).toEqual(['.a']);
    });

    test('passes when the translation moved along with it', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { a: 'one' },
            'xx.json': { a: 'uno' },
        });
        for (const [file, content] of [
            ['en.json', { a: 'ONE' }],
            ['xx.json', { a: 'UNO' }],
        ] as const)
            fs.writeFileSync(
                path.join(fixture.dir, file),
                JSON.stringify(content, null, 4),
            );
        expect(since(fixture, 'HEAD')).toEqual([]);
    });

    test('passes when the translation is already queued', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: 'uno' } });
        for (const [file, content] of [
            ['en.json', { a: 'ONE' }],
            ['xx.json', { a: '$!uno' }],
        ] as const)
            fs.writeFileSync(
                path.join(fixture.dir, file),
                JSON.stringify(content, null, 4),
            );
        expect(since(fixture, 'HEAD')).toEqual([]);
    });

    test('a new en-US key is not drift', () => {
        const fixture = makeFixture();
        fixture.commit({ 'en.json': { a: 'one' }, 'xx.json': { a: 'uno' } });
        fs.writeFileSync(
            path.join(fixture.dir, 'en.json'),
            JSON.stringify({ a: 'one', c: 'three' }, null, 4),
        );
        expect(since(fixture, 'HEAD')).toEqual([]);
    });

    test('ignores a rewording of an untranslatable path', () => {
        const fixture = makeFixture();
        fixture.commit({
            'en.json': { a: 'one', guidance: 'g' },
            'xx.json': { a: 'uno', guidance: 'g' },
        });
        fs.writeFileSync(
            path.join(fixture.dir, 'en.json'),
            JSON.stringify({ a: 'one', guidance: 'CHANGED' }, null, 4),
        );
        // `guidance` is a locale's own content, excluded by
        // getCheckableLocalePairs, so it never counts as drift.
        expect(since(fixture, 'HEAD')).toEqual([]);
    });
});

describe('marking', () => {
    test('never marks a name path, which must be reviewed by hand', () => {
        expect(isMarkable(staleEntry({ kind: 'name' }), false)).toBe(false);
        expect(isMarkable(staleEntry({ kind: 'plain' }), false)).toBe(true);
        expect(isMarkable(staleEntry({ kind: 'markup' }), false)).toBe(true);
    });

    test('--only-machine leaves hand-written translations alone', () => {
        expect(isMarkable(staleEntry({ machine: false }), false)).toBe(true);
        expect(isMarkable(staleEntry({ machine: false }), true)).toBe(false);
        expect(isMarkable(staleEntry({ machine: true }), true)).toBe(true);
    });

    test('replaces the existing write-status instead of stacking on it', () => {
        // A markup array is one document with exactly one marker on its first
        // element; `$!$~…` fails checkStringArrays.
        const text: Record<string, unknown> = {
            a: '$~uno',
            doc: ['$~uno', 'dos'],
        };
        const kinds = kindsOf(text);
        const entries = [staleEntry({ id: '.a' }), staleEntry({ id: '.doc' })];
        expect(markStale(entries, kinds, text)).toBe(2);
        expect(text.a).toBe(`${Revised}uno`);
        // The runtime reads an array's status from element 0 only, so the rest
        // must stay untouched.
        expect(text.doc).toEqual([`${Revised}uno`, 'dos']);
    });

    test('marks an unannotated string without disturbing its text', () => {
        const text: Record<string, unknown> = { a: 'uno' };
        expect(markStale([staleEntry()], kindsOf(text), text)).toBe(1);
        expect(text.a).toBe(`${Revised}uno`);
    });

    test('does not stack a marker on an already queued string', () => {
        const text: Record<string, unknown> = { a: `${Revised}uno` };
        expect(markStale([staleEntry()], kindsOf(text), text)).toBe(0);
        expect(text.a).toBe(`${Revised}uno`);
    });

    test('marked output still satisfies the markup-array contract', () => {
        // Marking a `$~` doc by prepending would leave `$!$~…`, which reads as
        // two write-statuses and fails checkStringArrays. A real locale path is
        // used so classifyPair resolves it as markup through the schema.
        const text = {
            output: { Say: { doc: ['$~uno', 'dos', 'tres'] } },
        } as unknown as LocaleText;
        markStale([staleEntry({ id: 'output.Say.doc' })], kindsOf(text), text);
        const { log } = collectingLog();
        checkStringArrays(log, text, text, false);
        expect(log.errorCount).toBe(0);
        expect(text.output.Say.doc).toEqual([`${Revised}uno`, 'dos', 'tres']);
    });
});

/**
 * Drift used to define its own tutorial path that hardcoded `-tutorial.json`,
 * so the quick tutorial was invisible to every drift path: reword a quick
 * lesson in English and its 30 translations silently stayed behind — the exact
 * failure drift exists to catch. These pin the two halves of the fix.
 */
describe('tutorial modes', () => {
    test('every mode resolves to its own file', () => {
        const paths = TutorialModes.map((mode) =>
            getTutorialPath('xx-XX', mode),
        );
        expect(new Set(paths).size).toBe(TutorialModes.length);
        expect(paths).toContain('static/locales/xx-XX/xx-XX-tutorial.json');
        expect(paths).toContain(
            'static/locales/xx-XX/xx-XX-tutorial-quick.json',
        );
    });

    test('a path is git-shaped, not platform-shaped', () => {
        // These are handed to `git show <rev>:<path>` and `git log -- <path>`,
        // which want forward slashes on every platform.
        for (const mode of TutorialModes)
            expect(getTutorialPath('xx-XX', mode)).not.toContain('\\');
    });

    test('each mode carries its own path kinds, because their ids collide', () => {
        // `acts.0.scenes.0.lines.0.2` exists in both tutorials and means
        // different text, so one merged map would resolve a path against the
        // wrong file.
        const line = (text: string) =>
            ({
                $schema: '',
                language: 'en',
                regions: ['US'],
                acts: [
                    {
                        title: 'Act',
                        performance: { fit: 'Phrase()' },
                        scenes: [
                            {
                                title: 'Scene',
                                subtitle: null,
                                performance: { fit: 'Phrase()' },
                                lines: [['Program', 'kind', text]],
                            },
                        ],
                    },
                ],
            }) as unknown as Tutorial;
        const id = 'acts.0.scenes.0.lines.0.2';
        const complete = getTranslatableTutorialPathKinds(line('complete'));
        const quick = getTranslatableTutorialPathKinds(line('quick'));
        expect(complete.has(id)).toBe(true);
        expect(quick.has(id)).toBe(true);
        expect(complete.get(id)?.pair.resolve(line('complete'))).toBe(
            'complete',
        );
        expect(quick.get(id)?.pair.resolve(line('quick'))).toBe('quick');
    });
});
