import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import { toStage } from '@output/Output/Stage';
import { AnimationState } from '@output/animation/OutputAnimation';
import Pose, { toPose } from '@output/animation/Pose';
import {
    poseMusicOf,
    shouldStrike,
    stagePoseMusic,
    strikesFor,
    type Struck,
} from '@output/animation/poseMusic';
import { createMusicLiteral } from '@output/Music/Music';
import Sequence, { toSequence } from '@output/animation/Sequence';
import Transition from '@output/animation/Transition';
import Evaluator from '@runtime/Evaluator';
import { expect, test } from 'vitest';

/** A short, quiet, non-looping piece, spelled the way a creator would. */
const Ding = `🎼(🎶([1 3 5]) name: 'ding')`;

function evaluate(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const evaluator = new Evaluator(
        project,
        DB,
        DefaultLocales.getLocales(),
        false,
    );
    const value = evaluator.getInitialValue();
    evaluator.stop();
    return {
        project,
        evaluator,
        value,
        conflicts: project.analyze().conflicts.map((c) => `${c}`),
    };
}

function poseOf(code: string) {
    const { project, value, conflicts } = evaluate(code);
    expect(conflicts).toEqual([]);
    const pose = toPose(project, value);
    if (pose === undefined) throw new Error('expected a pose');
    return { project, pose };
}

function sequenceOf(code: string) {
    const { project, value, conflicts } = evaluate(code);
    expect(conflicts).toEqual([]);
    const sequence = toSequence(project, value);
    if (sequence === undefined) throw new Error('expected a sequence');
    return { project, sequence };
}

test('a state slot pose sounds at the start of its state', () => {
    const { project, pose } = poseOf(`Pose(opacity: 0% music: ${Ding})`);
    const strikes = strikesFor(project, pose, [], 1000, 0, true);
    expect(strikes.map((strike) => strike.atMs)).toEqual([0]);
    expect(strikes[0].music.getName()).toBe('ding');
});

test('a pose with no music sounds nothing', () => {
    const { project, pose } = poseOf('Pose(rotation: 90°)');
    expect(strikesFor(project, pose, [], 1000, 0, true)).toEqual([]);
});

test('a pose that is not fresh sounds nothing', () => {
    const { project, pose } = poseOf(`Pose(music: ${Ding})`);
    expect(strikesFor(project, pose, [], 1000, 0, false)).toEqual([]);
});

test('a sequence pose sounds at its percentage', () => {
    const { project, sequence } = sequenceOf(
        `Sequence({0%: Pose() 50%: Pose(music: ${Ding}) 100%: Pose()} 2s)`,
    );
    const transitions = sequence.compile();
    if (transitions === undefined) throw new Error('expected transitions');
    const strikes = strikesFor(project, sequence, transitions, 2000, 0, true);
    expect(strikes.map((strike) => strike.atMs)).toEqual([1000]);
});

test('a 0% pose sounds at the top, unlike a cue', () => {
    const { project, sequence } = sequenceOf(
        `Sequence({0%: Pose(music: ${Ding}) 100%: Pose()} 2s)`,
    );
    const transitions = sequence.compile();
    if (transitions === undefined) throw new Error('expected transitions');
    expect(
        strikesFor(project, sequence, transitions, 2000, 0, true).map(
            (strike) => strike.atMs,
        ),
    ).toEqual([0]);
});

test('a repeated sequence sounds once per repetition', () => {
    const { project, sequence } = sequenceOf(
        `Sequence({0%: Pose() 100%: Pose(music: ${Ding})} 1s count: 3x)`,
    );
    const transitions = sequence.compile();
    if (transitions === undefined) throw new Error('expected transitions');
    // Total is the whole animation: three repetitions of a one-third slice.
    const strikes = strikesFor(project, sequence, transitions, 3000, 0, true);
    expect(strikes.map((strike) => Math.round(strike.atMs))).toEqual([
        1000, 2000, 3000,
    ]);
});

test('coincident strikes of one music fold together', () => {
    // A repetition boundary lands one repetition's last pose and the next
    // one's first at the very same millisecond.
    const { project, sequence } = sequenceOf(
        `Sequence({0%: Pose(music: ${Ding}) 100%: Pose(music: ${Ding})} 1s count: 2x)`,
    );
    const transitions = sequence.compile();
    if (transitions === undefined) throw new Error('expected transitions');
    const strikes = strikesFor(project, sequence, transitions, 2000, 0, true);
    expect(strikes.map((strike) => Math.round(strike.atMs))).toEqual([
        0, 1000, 2000,
    ]);
});

test('resuming skips what has already gone by', () => {
    const { project, sequence } = sequenceOf(
        `Sequence({0%: Pose(music: ${Ding}) 100%: Pose(music: ${Ding})} 2s)`,
    );
    const transitions = sequence.compile();
    if (transitions === undefined) throw new Error('expected transitions');
    expect(
        strikesFor(project, sequence, transitions, 2000, 1000, true).map(
            (strike) => strike.atMs,
        ),
    ).toEqual([2000]);
});

test('a lead-in transition never sounds', () => {
    // What `rest()` builds: the pose the output was already holding, prepended
    // to the sequence it is about to sweep.
    const { project, pose } = poseOf(`Pose(music: ${Ding})`);
    const { sequence } = sequenceOf(`Sequence({0%: Pose() 100%: Pose()} 1s)`);
    const compiled = sequence.compile();
    if (compiled === undefined) throw new Error('expected transitions');
    const withLeadIn = [
        new Transition(undefined, 1, pose, 0, undefined),
        ...compiled,
    ];
    expect(strikesFor(project, sequence, withLeadIn, 1000, 0, true)).toEqual(
        [],
    );
});

test('with() does not inherit music from the pose it overrides', () => {
    const { pose: resting } = poseOf(`Pose(rotation: 10° music: ${Ding})`);
    const { pose: moving } = poseOf('Pose(scale: 2)');
    // `rest.with(move)` is what a move builds; inheriting here would sound the
    // resting pose's music on every move.
    expect(resting.with(moving).music).toBeUndefined();
    expect(moving.with(resting).music).toBeDefined();
});

test('equals ignores music', () => {
    const { pose: withMusic } = poseOf(`Pose(rotation: 10° music: ${Ding})`);
    const { pose: without } = poseOf('Pose(rotation: 10°)');
    expect(withMusic.equals(without)).toBe(true);
});

test('shouldStrike refuses a re-issue of the animation already running', () => {
    const { pose } = poseOf(`Pose(music: ${Ding})`);
    const { pose: same } = poseOf(`Pose(music: ${Ding})`);
    const { pose: other } = poseOf(`Pose(rotation: 90° music: ${Ding})`);
    const struck: Struck = new Map([[AnimationState.Moving, pose]]);

    // Nothing struck in this state yet.
    expect(shouldStrike(new Map(), AnimationState.Moving, pose, false)).toBe(
        true,
    );
    // A physics body rebuilding the same tween every frame.
    expect(shouldStrike(struck, AnimationState.Moving, same, false)).toBe(
        false,
    );
    // The same poses, but the animation before them had ended — a second move,
    // or a loop coming round again.
    expect(shouldStrike(struck, AnimationState.Moving, same, true)).toBe(true);
    // A state not struck yet, or new poses.
    expect(shouldStrike(struck, AnimationState.Rest, same, false)).toBe(true);
    expect(shouldStrike(struck, AnimationState.Moving, other, false)).toBe(
        true,
    );
});

test('a resting pose returned to is not struck again', () => {
    const { pose: caught } = poseOf(`Pose(rotation: 180° music: ${Ding})`);
    const { pose: plain } = poseOf('Pose()');
    const struck: Struck = new Map();

    // Comes to rest in the caught pose.
    expect(shouldStrike(struck, AnimationState.Rest, caught, true)).toBe(true);
    struck.set(AnimationState.Rest, caught);
    // Moves, which ends by returning to rest in that same pose. The move's
    // animation has finished, so `renewed` alone would sound it a second time.
    struck.set(AnimationState.Moving, plain);
    expect(shouldStrike(struck, AnimationState.Rest, caught, true)).toBe(false);
    // Being let go, and caught again, both sound: the pose actually changed.
    expect(shouldStrike(struck, AnimationState.Rest, plain, true)).toBe(true);
});

test('a looping resting sequence sounds every time round', () => {
    const { sequence } = sequenceOf(
        `Sequence({0%: Pose() 100%: Pose(music: ${Ding})} 1s)`,
    );
    const struck: Struck = new Map([[AnimationState.Rest, sequence]]);
    // A loop starts again only once its animation has finished, which is what
    // tells it apart from a rebuild of one still running.
    expect(shouldStrike(struck, AnimationState.Rest, sequence, true)).toBe(
        true,
    );
    expect(shouldStrike(struck, AnimationState.Rest, sequence, false)).toBe(
        false,
    );
});

test('a pose used by many outputs sounds one piece, not many', () => {
    const { project, evaluator, value } = evaluate(
        `pop: Pose(music: ${Ding})
Stage(['a' 'b' 'c'].translate(ƒ(letter•'') Phrase(letter entering: pop)))`,
    );
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    const names = new Set(
        stagePoseMusic(project, stage).map((music) => music.getName()),
    );
    expect(names).toEqual(new Set(['ding']));
});

test('the stage collector finds music only a pose can reach', () => {
    const { project, evaluator, value } = evaluate(
        `Stage([Phrase('a' exiting: Pose(opacity: 0% music: ${Ding}))])`,
    );
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    // Not content music, so `getMusic` cannot see it — which is the whole
    // reason the safety gate needed a second collector.
    expect(stage.getMusic()).toEqual([]);
    expect(stagePoseMusic(project, stage).map((m) => m.getName())).toEqual([
        'ding',
    ]);
});

test('poseMusicOf reads all four states', () => {
    const { project, evaluator, value } = evaluate(
        `Stage([Phrase('a'
            entering: Pose(music: 🎼(🎶([1]) name: 'in'))
            resting: Pose(music: 🎼(🎶([2]) name: 'still'))
            moving: Pose(music: 🎼(🎶([3]) name: 'go'))
            exiting: Pose(music: 🎼(🎶([4]) name: 'out')))])`,
    );
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    const phrase = stage.content[0];
    if (phrase === null) throw new Error('expected a phrase');
    expect(poseMusicOf(project, phrase).map((m) => m.getName())).toEqual([
        'in',
        'still',
        'go',
        'out',
    ]);
});

test('an output with only pose music still counts as animated', () => {
    const { project, evaluator, value } = evaluate(
        `Stage([Phrase('a' duration: 0s resting: Pose(music: ${Ding}))])`,
    );
    if (value === undefined) throw new Error('expected a value');
    const stage = toStage(evaluator, value);
    if (stage === undefined) throw new Error('expected a stage');
    const only = stage.content[0];
    if (only === null) throw new Error('expected a phrase');
    expect(only.isAnimated()).toBe(true);
    expect(project.analyze().conflicts.map((c) => `${c}`)).toEqual([]);
});

test('a sequence and a pose are told apart as animation sources', () => {
    const { pose } = poseOf(`Pose(music: ${Ding})`);
    const { sequence } = sequenceOf(`Sequence({0%: Pose() 100%: Pose()})`);
    expect(pose instanceof Pose).toBe(true);
    expect(sequence instanceof Sequence).toBe(true);
});

test('the music the palette writes into a pose is valid code', () => {
    // A control that writes code the project then rejects is worse than no
    // control, so the literal is checked by building it and running it.
    const project = Project.make(
        null,
        'test',
        new Source('test', 'Phrase("a")'),
        [],
        DefaultLocale,
    );
    project.analyze();
    const music = createMusicLiteral(project, DefaultLocales);
    const {
        project: written,
        value,
        conflicts,
    } = evaluate(`Pose(music: ${music.toWordplay()})`);
    expect(conflicts).toEqual([]);
    expect(toPose(written, value)?.music).toBeDefined();
});
