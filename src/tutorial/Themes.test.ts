import { expect, test } from 'vitest';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import evaluateCode from '@runtime/evaluate';
import { NameGenerator, toStage } from '@output/Output/Stage';
import Evaluator from '@runtime/Evaluator';
import { DB } from '@db/Database';
import { performanceSource } from './Performances';
import { parsePerformance } from './Tutorial';
import { toMusic } from '@output/Music/Music';
import { analyzeMusic } from '@output/MusicSafetyAnalysis';
import { InstrumentKeys } from '@output/Music/instruments';
import { ScaleKeys } from '@output/Music/scales';
import { Themes, themeSource, type ThemeSpec } from './Themes';
import { ThemeNames, type ThemeName } from './ThemeNames';
import { getDefaultTutorial } from '@util/verify-locales/TutorialSchema';
import { TutorialModes } from './TutorialMode';

const entries = Object.entries(Themes) as [ThemeName, ThemeSpec][];

/** Evaluate a theme's source into a Music, the way a title card will. */
function musicOf(spec: ThemeSpec) {
    const code = themeSource(spec);
    const value = evaluateCode(code);
    const project = Project.make(
        null,
        'theme',
        new Source('theme', code),
        [],
        DefaultLocale,
    );
    expect(value, code).toBeDefined();
    const music = value
        ? toMusic(project, value, new NameGenerator())
        : undefined;
    expect(music, code).toBeDefined();
    return music;
}

test('every theme evaluates to a Music', () => {
    for (const [name, spec] of entries)
        expect(musicOf(spec), name).toBeDefined();
});

/**
 * The rule the whole vocabulary exists under. Title cards are read-only, so
 * ProjectView passes `warn={!editable}` and any risk here would put a start
 * gate in front of a lesson — a warning you have to dismiss to keep learning.
 * This asserts it against the real thresholds rather than trusting the
 * authoring rules that were chosen to clear them.
 */
test('no theme carries any music risk', () => {
    for (const [name, spec] of entries) {
        const music = musicOf(spec);
        const risks = music ? analyzeMusic(music.toData()) : new Set();
        expect([name, [...risks]]).toEqual([name, []]);
    }
});

test('themes obey the authoring rules', () => {
    for (const [name, spec] of entries) {
        expect([name, spec.tempo <= 132], 'tempo').toEqual([name, true]);
        // The floor is the point: below about a quarter these are inaudible
        // against a room. The ceiling keeps four tracks summing under the
        // level at which quiet parts add up to a loud piece.
        expect(
            [name, spec.volume >= 25 && spec.volume <= 35],
            'volume',
        ).toEqual([name, true]);
        expect(ScaleKeys, `${name} scale`).toContain(spec.scale);
        expect([
            name,
            spec.layers.length >= 1 && spec.layers.length <= 4,
        ]).toEqual([name, true]);

        for (const layer of spec.layers) {
            expect(InstrumentKeys, `${name} instrument`).toContain(
                layer.instrument,
            );
            // The one voice in the tutorial is the dialogue.
            expect([name, layer.instrument]).not.toEqual([name, 'voice']);
            // At least a beat an entry: this is what keeps the fastest theme
            // under the 3Hz pulse band at the fastest tempo.
            expect([name, (layer.beat ?? 1) >= 1], 'beat').toEqual([
                name,
                true,
            ]);
            expect([name, Math.abs(layer.key ?? 0) <= 12], 'key').toEqual([
                name,
                true,
            ]);
            expect([name, Math.abs(layer.pan ?? 0) <= 1], 'pan').toEqual([
                name,
                true,
            ]);

            // Bounded on the loop's length in beats, not its entry count: a
            // pad covering eight beats is two entries and a melody covering
            // the same eight is eight of them.
            const { motif } = layer;
            const beats = motif.length * (layer.beat ?? 1);
            expect([name, beats >= 4 && beats <= 16], 'loop length').toEqual([
                name,
                true,
            ]);
            // There is no cross-fade: the theme is cut the moment you advance
            // past the title card, and a loop cut at a rest is not a jarring
            // cut. This is also what makes the loop point sound intentional.
            expect([name, motif.at(-1)], 'ends on a rest').toEqual([
                name,
                null,
            ]);

            for (const value of motif) {
                if (value === null) continue;
                const degrees = typeof value === 'number' ? [value] : value;
                for (const degree of degrees)
                    expect(
                        [name, degree >= 1 && degree <= 10],
                        'degree',
                    ).toEqual([name, true]);
            }
        }
    }
});

/** A theme is atmosphere, not content: nothing here should ever sing. */
test('no theme carries lyrics or a description', () => {
    for (const [name, spec] of entries) {
        const data = musicOf(spec)?.toData();
        expect([name, data?.description]).toEqual([name, undefined]);
        for (const track of data?.tracks ?? [])
            for (const note of track.notes)
                expect([name, note.words]).toEqual([name, undefined]);
    }
});

/**
 * The invariant the whole composition rests on, and the one that fails
 * silently: a theme that doesn't reach the stage plays nothing and says nothing
 * about why. The two placements in `performanceSource` are the thing being
 * checked — a template that builds its own stage places the theme inside it,
 * everything else appends it. Rather than test the textual rule, evaluate every
 * title card the way the tutorial will and check that the music is actually on
 * the stage — and while we're here, that no card gates.
 */
test('every title card carries its theme onto the stage, risk-free', () => {
    for (const mode of TutorialModes) {
        const tutorial = getDefaultTutorial(mode);
        const cards = tutorial.acts.flatMap((act) => [
            act.performance,
            ...act.scenes.map((scene) => scene.performance),
        ]);
        for (const card of cards) {
            const parsed = parsePerformance(card);
            if (parsed.theme === undefined) continue;
            const code = performanceSource(
                parsed.code,
                themeSource(Themes[parsed.theme]),
            );
            const source = new Source('card', code);
            const project = Project.make(
                null,
                'card',
                source,
                [],
                DefaultLocale,
            );
            const evaluator = new Evaluator(
                project,
                DB,
                [DefaultLocale],
                false,
            );
            const value = evaluator.getInitialValue();
            const stage = value ? toStage(evaluator, value) : undefined;
            const music = stage?.getMusic() ?? [];
            expect([parsed.theme, music.length]).toEqual([parsed.theme, 1]);
            expect([
                parsed.theme,
                [...analyzeMusic(music[0].toData())],
            ]).toEqual([parsed.theme, []]);
        }
    }
});

/**
 * The whole point of having a theme per character: no two cards sound alike.
 *
 * They did. `Act1`, `Time` and `ExpressionPlaceholder` were all a single struck
 * bell, and Act 7's lead line was note-for-note `FunctionDefinition`'s — so
 * paging through the tutorial kept replaying tunes you'd already heard, which
 * is worse than no theme at all, because it says two unrelated cards are the
 * same thing. Comparing the sounding content rather than the name is the only
 * version of this check that stays true as the vocabulary grows.
 */
test('no two themes sound the same', () => {
    const heard = new Map<string, ThemeName>();
    const clashes: string[] = [];
    for (const [name, spec] of entries) {
        // Everything a listener could tell apart, and nothing they couldn't:
        // the doc comment and the theme's name are deliberately excluded.
        const signature = JSON.stringify([
            spec.tempo,
            spec.scale,
            spec.layers.map((l) => [
                l.instrument,
                l.motif,
                l.beat ?? 1,
                l.volume ?? 100,
                l.key ?? 0,
                l.pan ?? 0,
            ]),
        ]);
        const already = heard.get(signature);
        if (already !== undefined) clashes.push(`${already} = ${name}`);
        else heard.set(signature, name);
    }
    expect(clashes).toEqual([]);
});

/**
 * Every act's opening scene teaches no concept, and used to fall back to its
 * act's theme — so the act card and the very next card played the same tune
 * back to back, which is exactly where a repeat is most obvious.
 */
test('no act card shares a theme with the card after it', () => {
    const repeats: string[] = [];
    for (const mode of TutorialModes)
        for (const [index, act] of getDefaultTutorial(mode).acts.entries()) {
            const first = act.scenes[0]?.performance.theme;
            if (first !== undefined && first === act.performance.theme)
                repeats.push(`${mode} act ${index + 1}: ${first}`);
        }
    expect(repeats).toEqual([]);
});

test('ThemeNames lists exactly the themes that exist', () => {
    expect([...ThemeNames].sort()).toEqual(Object.keys(Themes).sort());
});

/**
 * The check that keeps the vocabulary honest as the tutorial grows: every
 * concept a scene teaches needs a theme, or its title card silently falls back
 * to its act's. `None` is the deliberate exception — it only ever says "…", so
 * it gets no theme at all.
 */
test('every concept a scene teaches has a theme', () => {
    const missing = new Set<string>();
    for (const mode of TutorialModes)
        for (const act of getDefaultTutorial(mode).acts)
            for (const scene of act.scenes)
                if (
                    scene.concept !== undefined &&
                    scene.concept !== 'None' &&
                    !(scene.concept in Themes)
                )
                    missing.add(scene.concept);
    expect([...missing]).toEqual([]);
});
