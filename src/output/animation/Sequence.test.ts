import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Project from '@db/projects/Project';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import { DB } from '@db/Database';
import { Animations } from '@output/animation/DefaultSequences';
import Sequence, { toSequence } from '@output/animation/Sequence';
import Pose from '@output/animation/Pose';
import { must } from '@util/nullable';
import FunctionDefinition from '@nodes/FunctionDefinition';
import { describe, expect, test } from 'vitest';

function analyzeAndEvaluate(code: string) {
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
        value,
        conflicts: project.analyze().conflicts.map((c) => `${c}`),
    };
}

test('every animation is a static function on Sequence', () => {
    const { project } = analyzeAndEvaluate('1');
    const statics = project.shares.output.Sequence.getStaticDefinitions(
        project.getContext(project.getMain()),
    );
    const names = statics
        .filter((s) => s instanceof FunctionDefinition)
        .map((s) => s.names.getNames()[0]);
    expect(names).toEqual(Animations.map((a) => a.key));
});

// Each animation is generated Wordplay source, so a typo in a pose map or an input name is
// only caught by actually building and running it. `toSequence` returning a value proves the
// static evaluated to a real Sequence rather than an exception.
describe.each(Animations.map((a) => [a.key] as const))('Sequence.%s', (key) => {
    test('evaluates with its defaults', () => {
        const { project, value, conflicts } = analyzeAndEvaluate(
            `Sequence.${key}()`,
        );
        expect(conflicts).toEqual([]);
        const sequence = toSequence(project, value);
        expect(sequence).toBeDefined();
        expect(sequence?.poses.length).toBeGreaterThan(1);
    });

    test('passes duration, style, and count through', () => {
        const { project, value, conflicts } = analyzeAndEvaluate(
            `Sequence.${key}(⏳: 2s style: "zippy" count: 3x)`,
        );
        expect(conflicts).toEqual([]);
        const sequence = toSequence(project, value);
        expect(sequence?.duration).toBe(2);
        expect(sequence?.style).toBe('zippy');
        expect(sequence?.count).toBe(3);
    });
});

test('an animation with its own input takes it positionally, then duration', () => {
    const { project, value, conflicts } = analyzeAndEvaluate(
        'Sequence.sway(10° 1s)',
    );
    expect(conflicts).toEqual([]);
    const sequence = toSequence(project, value);
    expect(sequence?.duration).toBe(1);
    // 0%, 50%, 100% — tilting to -10°, 10°, -10°.
    expect(sequence?.poses.map((p) => p.pose.rotation)).toEqual([-10, 10, -10]);
});

test('a Place-valued input slides from where it is given', () => {
    const { project, value } = analyzeAndEvaluate(
        'Sequence.slidein(Place(x: -5m y: 2m))',
    );
    const sequence = toSequence(project, value);
    expect(sequence?.poses[0]?.pose.offset?.x).toBe(-5);
    expect(sequence?.poses[0]?.pose.offset?.y).toBe(2);
});

test('a Color-valued input glows around the color it is given', () => {
    const { project, value } = analyzeAndEvaluate('Sequence.glow(Color.blue)');
    const sequence = toSequence(project, value);
    expect(sequence?.poses[0]?.pose.color).toBeDefined();
    // The midpoint is lighter than the endpoints, which is what makes it a glow.
    const lightness = sequence?.poses.map((p) =>
        p.pose.color?.lightness.toNumber(),
    );
    expect(lightness?.[1]).toBeGreaterThan(lightness?.[0] ?? 0);
});

/**
 * `compile()` returns a `TransitionSequence`, which is two transitions or more.
 * The old code asserted that shape onto whatever the repetition loop built, so
 * a sequence whose count was zero produced an empty array claiming to hold two
 * and the animator read past its end. The language now types `count` as a
 * literal union, but `Sequence` is also built by `toSequence` from values that
 * did not come through a call, so the clamp and the check are what make the
 * declared shape true.
 */
describe('a sequence compiles to a real transition sequence or to nothing', () => {
    // Any value will do as the node a sequence came from; what is under test
    // is the arithmetic over poses and count.
    const from = must(analyzeAndEvaluate('ø').value, 'a value');
    const pose = new Pose(from);

    function sequence(count: number, poses: number) {
        return new Sequence(
            from,
            count,
            [...Array(poses).keys()].map((index) => ({
                percent: poses === 1 ? 0 : index / (poses - 1),
                pose,
            })),
            1,
            'straight',
        );
    }

    test.each([-5, 0, 0.4, 1, 3, 1000])(
        'count %s still yields at least two transitions',
        (count) => {
            const compiled = sequence(count, 3).compile();
            expect(compiled).toBeDefined();
            expect(compiled?.length).toBeGreaterThanOrEqual(2);
            for (const transition of compiled ?? [])
                expect(Number.isFinite(transition.duration)).toBe(true);
        },
    );

    test('a single pose animates its duration, and no pose animates nothing', () => {
        expect(sequence(1, 1).compile()?.length).toBe(2);
        expect(sequence(1, 0).compile()).toBeUndefined();
    });

    test('a count that is not a number declines rather than half-animating', () => {
        // The clamp cannot make a number out of NaN, so the length check is
        // what stands between it and a sequence of no transitions typed as two.
        expect(sequence(Number.NaN, 3).compile()).toBeUndefined();
    });
});
