import { expect, test } from 'vitest';
import { DB } from '@db/Database';
import DefaultLocale from '@locale/DefaultLocale';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { toStage } from '@output/Output/Stage';
import { analyzeMusic } from '@output/MusicSafetyAnalysis';
import { signatureOf } from '@output/Music/musicData';
import ExceptionValue from '@values/ExceptionValue';
import { getDefaultTutorial } from '@util/verify-locales/TutorialSchema';
import { Performances, performanceSource } from './Performances';
import { isPerformance, parsePerformance } from './Tutorial';

function stageFrom(code: string) {
    const source = new Source('finale', code);
    const project = Project.make(null, 'finale', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], false);
    const value = evaluator.getInitialValue();
    return {
        evaluator,
        value,
        stage: value ? toStage(evaluator, value) : undefined,
    };
}

/** The finale's music, which the tutorial shows twice: once to edit, once to watch. */
function finaleMusic() {
    const { stage } = stageFrom(Performances.EvaluateDance15());
    const music = stage?.getMusic() ?? [];
    expect(music).toHaveLength(1);
    return music[0].toData();
}

test('the finale dances to a band', () => {
    const music = finaleMusic();
    expect(music.tracks).toHaveLength(4);
    expect(music.tracks.map((track) => track.instrument)).toEqual([
        'flute',
        'synthBass',
        'synthPad',
        'drums',
    ]);
});

/**
 * The swap the finale rests on. `EvaluateDance14` moved the cast on
 * `∆ Time(750ms)`; `EvaluateDance15` moves it on `∆ beat`, which is the payoff
 * for Evaluate asking @Reaction for "a beat, maybe 0.75 seconds". That is only
 * an honest substitution if a beat *is* 750ms — the player emits one tick per
 * integer transport beat, not per note, so the drums' half-beat subdivision
 * doesn't double the dance's speed. At any other tempo the choreography, and
 * its 0.5s move pose, would no longer fit.
 */
test('the finale beats exactly as often as the clock it replaced', () => {
    expect(finaleMusic().tempo).toBe(80);
    expect((60 / finaleMusic().tempo) * 1000).toBe(750);
});

/**
 * The finale is shown in `fix` mode, and ProjectView passes `warn={!editable}`
 * — so any risk here would put a start gate over the last scene of the
 * tutorial, which a learner would have to dismiss to see the ending.
 */
test('the finale carries no music risk', () => {
    expect([...analyzeMusic(finaleMusic())]).toEqual([]);
});

/**
 * The Music scene's five lessons. `npm run locales` compiles them and checks
 * for conflicts, which is not the same as running them: the scene exists to
 * make sound, and a program that parses cleanly and produces no `Music` — or
 * throws on its first evaluation — is a lesson that teaches nothing. Neither
 * failure is a conflict, so nothing else here would notice.
 */
test('every Music lesson evaluates and makes music', () => {
    const scene = getDefaultTutorial('complete')
        .acts[5].scenes.find((s) => s.concept === 'Music');
    expect(scene, 'the Music scene').toBeDefined();

    const programs = (scene?.lines ?? [])
        .filter(isPerformance)
        .map((line) => parsePerformance(line))
        .filter((parsed) => parsed.mode === 'edit')
        .map((parsed) => performanceSource(parsed.code, undefined));
    expect(programs).toHaveLength(5);

    for (const code of programs) {
        const { value, stage } = stageFrom(code);
        expect([code.slice(0, 40), value instanceof ExceptionValue]).toEqual([
            code.slice(0, 40),
            false,
        ]);
        expect([code.slice(0, 40), stage?.getMusic().length]).toEqual([
            code.slice(0, 40),
            1,
        ]);
    }
});

/**
 * The non-obvious one. The music is on the stage, and `@Beat` re-evaluates the
 * program on every beat, which rebuilds the `Music` value — so if either the
 * name or the content signature moved between evaluations, the player would
 * reconcile it as a different piece and restart the music on every beat.
 */
test('re-evaluating the finale does not restart its music', () => {
    const { evaluator, value } = stageFrom(Performances.EvaluateDance15());
    expect(value).toBeDefined();
    const first = toStage(evaluator, value!)?.getMusic()[0];
    const second = toStage(evaluator, value!)?.getMusic()[0];
    expect(first?.getName()).toBe(second?.getName());
    expect(signatureOf(first!.toData())).toBe(signatureOf(second!.toData()));
});
