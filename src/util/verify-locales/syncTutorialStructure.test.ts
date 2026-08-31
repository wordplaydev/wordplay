import fs from 'fs';
import { describe, expect, test } from 'vitest';
import { Revised, Unwritten } from '@locale/Annotations';
import type Tutorial from '../../tutorial/Tutorial';
import type {
    Act,
    CharacterName,
    Dialog,
    Line,
    Scene,
} from '../../tutorial/Tutorial';
import type { ThemeName } from '../../tutorial/ThemeNames';
import { TutorialModes } from '../../tutorial/TutorialMode';
import { getTutorialPath } from './TutorialSchema';
import {
    align,
    isEmptyReport,
    lineSignature,
    sceneSignature,
    syncTutorialStructure,
} from './syncTutorialStructure';

// ── Fixtures ─────────────────────────────────────────────────────────────────

function scene(
    title: string,
    concept?: CharacterName,
    lines: Line[] = [],
): Scene {
    return {
        title,
        subtitle: `${title} subtitle`,
        ...(concept === undefined ? {} : { concept }),
        performance: { fit: `Phrase('${title}')` },
        lines,
    };
}

function dialog(
    character: CharacterName,
    emotion: Dialog[1],
    ...text: string[]
): Dialog {
    return [character, emotion, ...text];
}

function tutorial(acts: Act[]): Tutorial {
    return {
        $schema: '../../schemas/Tutorial.json',
        language: 'en',
        regions: ['US'],
        acts,
    };
}

/** Acts are told apart by their title card's theme, so fixtures need one. */
function act(title: string, scenes: Scene[], theme: ThemeName = 'Act1'): Act {
    return {
        title,
        performance: { fit: `Phrase('${title} act')`, theme },
        scenes,
    };
}

/** The same tutorial with every translated string replaced, as a locale's would be. */
function translated(
    source: Tutorial,
    mark: (text: string) => string,
): Tutorial {
    const copy = JSON.parse(JSON.stringify(source)) as Tutorial;
    for (const a of copy.acts) {
        a.title = mark(a.title);
        for (const s of a.scenes) {
            s.title = mark(s.title);
            if (s.subtitle !== null) s.subtitle = mark(s.subtitle);
            s.lines = s.lines.map((line) =>
                line !== null && Array.isArray(line)
                    ? ([
                          line[0],
                          line[1],
                          ...line.slice(2).map((t) => mark(t as string)),
                      ] as unknown as Line)
                    : line,
            );
        }
    }
    return copy;
}

/** Every translated string, in order, for the byte-identity assertion. */
function translations(t: Tutorial): string[] {
    const out: string[] = [];
    for (const a of t.acts) {
        out.push(a.title);
        for (const s of a.scenes) {
            out.push(s.title);
            if (s.subtitle !== null) out.push(s.subtitle);
            for (const line of s.lines)
                if (line !== null && Array.isArray(line))
                    for (const text of line.slice(2)) out.push(text as string);
        }
    }
    return out;
}

const sync = (source: Tutorial, target: Tutorial, propagateRevised = false) =>
    syncTutorialStructure(source, target, { propagateRevised });

// ── The invariant ────────────────────────────────────────────────────────────

describe('inserting into en-US never disturbs an existing translation', () => {
    const base = tutorial([
        act('One', [
            scene('A', 'Program', [
                dialog('Program', 'kind', 'a1'),
                null,
                dialog('Evaluate', 'shy', 'a2'),
            ]),
            scene('B', 'Evaluate', [dialog('Evaluate', 'sad', 'b1')]),
            scene('C', 'Stage', [dialog('Stage', 'neutral', 'c1')]),
        ]),
        act('Two', [scene('D', 'Doc', [dialog('Doc', 'happy', 'd1')])], 'Act2'),
    ]);
    const locale = translated(base, (text) => `«${text}»`);
    const before = translations(locale);

    test('a scene inserted mid-act', () => {
        const source = JSON.parse(JSON.stringify(base)) as Tutorial;
        source.acts[0].scenes.splice(
            2,
            0,
            scene('New', 'Music', [dialog('Music', 'serious', 'new line')]),
        );

        const { tutorial: result, report } = sync(source, locale);

        // Every string the locale already had, untouched and in order.
        const after = translations(result);
        expect(after.filter((text) => !text.startsWith(Unwritten))).toEqual(
            before,
        );
        // And the new scene landed at the right index, fully marked.
        expect(result.acts[0].scenes.map((s) => s.concept)).toEqual([
            'Program',
            'Evaluate',
            'Music',
            'Stage',
        ]);
        expect(report.inserted).toEqual([
            expect.objectContaining({
                kind: 'scene',
                act: 1,
                scene: 3,
                strings: 3,
            }),
        ]);
        // A bare marker, with no copy of the English: falling back to the
        // source locale is automatic, so carrying it would only duplicate it.
        expect(result.acts[0].scenes[2].title).toBe(Unwritten);
    });

    test('lines inserted mid-scene', () => {
        const source = JSON.parse(JSON.stringify(base)) as Tutorial;
        source.acts[0].scenes[0].lines.splice(
            1,
            0,
            dialog('Music', 'kind', 'interjection'),
            { fit: "Phrase('🎼')" },
        );

        const { tutorial: result, report } = sync(source, locale);

        expect(
            translations(result).filter((t) => !t.startsWith(Unwritten)),
        ).toEqual(before);
        expect(result.acts[0].scenes[0].lines.map(lineSignature)).toEqual(
            source.acts[0].scenes[0].lines.map(lineSignature),
        );
        expect(report.inserted.map((i) => i.kind)).toEqual(['line', 'line']);
    });

    test('a whole act inserted', () => {
        const source = JSON.parse(JSON.stringify(base)) as Tutorial;
        source.acts.splice(
            1,
            0,
            act(
                'Interlude',
                [scene('E', 'Music', [dialog('Music', 'kind', 'e1')])],
                'Act3',
            ),
        );

        const { tutorial: result, report } = sync(source, locale);

        expect(
            translations(result).filter((t) => !t.startsWith(Unwritten)),
        ).toEqual(before);
        expect(result.acts.map((a) => a.title)).toEqual([
            '«One»',
            Unwritten,
            '«Two»',
        ]);
        expect(report.inserted).toEqual([
            expect.objectContaining({ kind: 'act', act: 2 }),
        ]);
    });
});

test('a scene the locale has and en-US does not is reported, never deleted', () => {
    const source = tutorial([act('One', [scene('A', 'Program')])]);
    const target = translated(source, (t) => `«${t}»`);
    target.acts[0].scenes.push(scene('Extra', 'Doc'));

    const { tutorial: result, report } = sync(source, target);

    expect(result.acts[0].scenes.map((s) => s.title)).toEqual(['«A»', 'Extra']);
    expect(report.removed).toEqual([
        expect.objectContaining({ kind: 'scene', label: 'Extra' }),
    ]);
});

test('signatures discriminate on the untranslated fields only', () => {
    const a = scene('A', 'Program');

    // Different concept: a different scene.
    expect(sceneSignature(a)).not.toBe(sceneSignature(scene('A', 'Doc')));

    // Different translated title, everything else the same: the same scene.
    expect(sceneSignature(a)).toBe(
        sceneSignature({ ...a, title: 'translated' }),
    );

    // Literal code is not identity: es-MX writes `Frase` where en-US writes
    // `Phrase`, and zh-CN translates the literals inside its examples. Reading
    // the code would call those different lessons and duplicate them.
    expect(sceneSignature(a)).toBe(
        sceneSignature({
            ...a,
            performance: { fit: "Frase('A' fondo: Color(0% 0 0°))" },
        }),
    );

    // A template reference is identity: its name is an en-US identifier no
    // locale translates, and it's what keeps sibling lessons apart.
    const symbol = { ...a, performance: { fit: '#Symbol 💡' } };
    const search = { ...a, performance: { fit: '#PatternSearch' } };
    expect(sceneSignature(symbol)).not.toBe(sceneSignature(search));
    expect(sceneSignature(symbol)).not.toBe(
        sceneSignature({ ...a, performance: { fit: '#Symbol 🔨' } }),
    );

    // A dialog's text is not part of its identity; its emotion is.
    expect(lineSignature(dialog('Doc', 'kind', 'hello'))).toBe(
        lineSignature(dialog('Doc', 'kind', 'hola')),
    );
    expect(lineSignature(dialog('Doc', 'kind', 'x'))).not.toBe(
        lineSignature(dialog('Doc', 'sad', 'x')),
    );
});

describe('$! propagation', () => {
    const source = tutorial([
        act('One', [
            scene('A', 'Program', [dialog('Program', 'kind', 'Hello')]),
        ]),
    ]);

    function propagated(sourceText: string, targetText: string) {
        const from = JSON.parse(JSON.stringify(source)) as Tutorial;
        (from.acts[0].scenes[0].lines[0] as string[])[2] = sourceText;
        const to = JSON.parse(JSON.stringify(source)) as Tutorial;
        (to.acts[0].scenes[0].lines[0] as string[])[2] = targetText;
        const { tutorial: result } = sync(from, to, true);
        return (result.acts[0].scenes[0].lines[0] as string[])[2];
    }

    test('a revised source marks a clean translation', () => {
        expect(propagated(`${Revised}Hello`, 'Hola')).toBe(`${Revised}Hola`);
    });

    test('an unrevised source changes nothing', () => {
        expect(propagated('Hello', 'Hola')).toBe('Hola');
    });

    test('a stale machine translation is re-queued, and markers never stack', () => {
        // A machine translation of a sentence that changed is now wrong, so it
        // is marked like any other — but the marker replaces, never stacks.
        expect(propagated(`${Revised}Hello`, '$~Hola')).toBe(`${Revised}Hola`);
        // Unwritten is left alone: it's already queued and still holds English,
        // and `$!` would lose the fact that it was never written at all.
        expect(propagated(`${Revised}Hello`, `${Unwritten}Hello`)).toBe(
            `${Unwritten}Hello`,
        );
        // Already revised: nothing to say, and nothing to double up.
        expect(propagated(`${Revised}Hello`, `${Revised}Hola`)).toBe(
            `${Revised}Hola`,
        );
    });

    test('nothing propagates unless asked', () => {
        const from = JSON.parse(JSON.stringify(source)) as Tutorial;
        (from.acts[0].scenes[0].lines[0] as string[])[2] = `${Revised}Hello`;
        const to = translated(source, (t) => `«${t}»`);
        const { tutorial: result } = sync(from, to, false);
        expect((result.acts[0].scenes[0].lines[0] as string[])[2]).toBe(
            '«Hello»',
        );
    });
});

test('syncing is idempotent', () => {
    const source = tutorial([
        act('One', [
            scene('A', 'Program', [dialog('Program', 'kind', 'a')]),
            scene('B', 'Music', [dialog('Music', 'kind', 'b')]),
        ]),
    ]);
    const target = translated(source, (t) => `«${t}»`);
    target.acts[0].scenes.splice(1, 1);

    const once = sync(source, target).tutorial;
    const twice = sync(source, once);
    expect(twice.tutorial).toEqual(once);
    expect(isEmptyReport(twice.report)).toBe(true);
});

test('align keeps both sides when neither is a subsequence of the other', () => {
    const steps = align(['a', 'b', 'c'], ['a', 'x', 'c'], (s) => s);
    expect(steps.map((s) => s.kind)).toEqual([
        'keep',
        'insert',
        'remove',
        'keep',
    ]);
});

// ── Paragraphs within a line ─────────────────────────────────────────────────

/**
 * A dialog line's paragraph count is the one thing the line-level merge can't
 * see: `lineSignature` is character and emotion, so a line that grew a
 * paragraph still aligns, and the paragraph is never inserted or reported. That
 * left 23 locales without the paragraph defining "stage" for as long as it had
 * existed.
 */
describe('paragraphs within an aligned line', () => {
    /** A line whose paragraphs are told apart by their concept references —
     *  the one signal a translation preserves. */
    const source = tutorial([
        act('One', [
            scene('A', 'Program', [
                dialog(
                    'Program',
                    'kind',
                    'the @editor paragraph',
                    'the @stage paragraph',
                    'a closing paragraph',
                ),
            ]),
        ]),
    ]);

    function targetWith(...text: string[]): Tutorial {
        return tutorial([
            act('One', [
                scene('«A»', 'Program', [dialog('Program', 'kind', ...text)]),
            ]),
        ]);
    }

    test('a paragraph en-US appended is appended here, unwritten', () => {
        const { tutorial: synced, report } = sync(
            source,
            targetWith('«the @editor paragraph»', '«the @stage paragraph»'),
        );
        expect(synced.acts[0].scenes[0].lines[0]).toEqual([
            'Program',
            'kind',
            '«the @editor paragraph»',
            '«the @stage paragraph»',
            Unwritten,
        ]);
        expect(report.padded).toHaveLength(1);
        expect(report.padded[0].strings).toBe(1);
        // Not folded into `inserted`: the shipped-tutorial tests below assert
        // that bucket is empty, and a paragraph is not a missing line.
        expect(report.inserted).toHaveLength(0);
    });

    test('punctuation after a reference does not defeat the match', () => {
        // A translator ends the sentence in their own script; the reference is
        // the same reference.
        const { report } = sync(
            source,
            targetWith('「@editor。」', '「@stage、」'),
        );
        expect(report.padded).toHaveLength(1);
        expect(report.unpaired).toHaveLength(0);
    });

    test('a paragraph en-US inserted in the middle is reported, not appended', () => {
        // This locale has the first and *last* paragraphs: appending would put
        // the placeholder after a paragraph that already translates the one it
        // stands for, and `translateTutorial` resolves English by position, so
        // every survivor would stay wrong.
        const { tutorial: synced, report } = sync(
            source,
            targetWith('«the @editor paragraph»', '«a closing paragraph»'),
        );
        expect(synced.acts[0].scenes[0].lines[0]).toHaveLength(4);
        expect(report.padded).toHaveLength(0);
        expect(report.unpaired).toEqual([
            expect.objectContaining({ kind: 'line', source: 3, target: 2 }),
        ]);
    });

    test('a paragraph this locale has and en-US does not is reported, never deleted', () => {
        const { tutorial: synced, report } = sync(
            source,
            targetWith(
                '«the @editor paragraph»',
                '«the @stage paragraph»',
                '«a closing paragraph»',
                '«one of our own»',
            ),
        );
        expect(synced.acts[0].scenes[0].lines[0]).toHaveLength(6);
        expect(report.unpaired).toEqual([
            expect.objectContaining({ source: 3, target: 4 }),
        ]);
    });

    test('padding is idempotent', () => {
        const once = sync(
            source,
            targetWith('«the @editor paragraph»', '«the @stage paragraph»'),
        ).tutorial;
        const twice = sync(source, once);
        expect(twice.tutorial).toEqual(once);
        expect(isEmptyReport(twice.report)).toBe(true);
    });
});

// ── The regression net ───────────────────────────────────────────────────────

/**
 * Over the real files — the check that would have caught the "Patterns" drift
 * the day it landed, and that keeps the 30 tutorials aligned from here on.
 *
 * The two halves say different things. Nothing may be *missing*: a locale
 * short a scene, a line, or a performance is a lesson its learners never see,
 * or a stale program left where en-US replaced one, and after a sync run there
 * should be none of that anywhere. Extra translated dialog is a different
 * matter — the sync deliberately won't delete somebody's writing — so the
 * locales that have some are recorded here instead. Both directions fail on
 * anything new.
 */
describe('the shipped tutorials', () => {
    const locales = fs
        .readdirSync('static/locales')
        .filter((locale) => locale !== 'en-US');

    for (const mode of TutorialModes) {
        const source = JSON.parse(
            fs.readFileSync(getTutorialPath('en-US', mode), 'utf8'),
        ) as Tutorial;

        function reports() {
            return locales
                .map(
                    (locale) =>
                        [locale, getTutorialPath(locale, mode)] as const,
                )
                .filter(([, path]) => fs.existsSync(path))
                .map(([locale, path]) => {
                    const target = JSON.parse(
                        fs.readFileSync(path, 'utf8'),
                    ) as Tutorial;
                    return [locale, sync(source, target).report] as const;
                });
        }

        test(`no locale's ${mode} tutorial is missing anything en-US has`, () => {
            expect(
                reports()
                    .filter(
                        ([, report]) =>
                            report.inserted.length > 0 ||
                            report.dropped.length > 0,
                    )
                    .map(
                        ([locale, report]) =>
                            `${locale}: +${report.inserted.length} −${report.dropped.length}`,
                    ),
            ).toEqual([]);
        });

        /**
         * `syncTutorialStructure` reports a line en-US doesn't have and keeps it, since it
         * can't tell a stale duplicate from deliberate authorship. es-MX, zh-CN and zh-TW
         * carried 25 between them, every one a near-duplicate left behind when an en-US
         * emotion change forked a line into an inserted machine translation beside the
         * retained hand-written one. They were read and merged by hand; nothing should
         * accumulate here again without someone deciding what the dialog should say.
         */
        test(`no locale has extra ${mode} dialog`, () => {
            const extra: Record<string, number> = {};
            for (const [locale, report] of reports())
                if (report.removed.length > 0)
                    extra[locale] = report.removed.length;
            expect(extra).toEqual({});
        });
    }
});
