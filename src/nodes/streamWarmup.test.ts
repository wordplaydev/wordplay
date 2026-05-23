import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Time from '@input/Time';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import Reaction from '@nodes/Reaction';
import { expect, test } from 'vitest';

/**
 * Issue #679: Stream creators inside branches that aren't chosen on first
 * evaluation must still be instantiated, so the program can react when those
 * streams later fire. Match and Conditional emit a warmup prelude that
 * evaluates every stream-creating call in any branch.
 */

function nonReactionStreamCount(evaluator: Evaluator): number {
    return Array.from(evaluator.streamsByCreator.keys()).filter(
        (s) => !(s instanceof Reaction),
    ).length;
}

test.each([
    // Match: stream creator in a case value that isn't chosen.
    // Case 0 doesn't match (0 != 1) so its value (with Time) is skipped.
    ['0 ??? 1: Time() 0'],
    // Match: stream creator in a later case key that is skipped because an
    // earlier case matched. Case keys are evaluated sequentially up to the
    // first match — once case 0 matches (0 == 0), case 1's key (with Time)
    // is never reached by the normal evaluation path.
    ['0 ??? 0: 1 Time(): 2 3'],
    // Match: stream creator in the other (default) branch, skipped because
    // case 0 matched.
    ['1 ??? 1: 0 Time()'],
    // Conditional: stream creator in the yes branch when condition is false.
    ['⊥ ? Time() 0'],
    // Conditional: stream creator in the no branch when condition is true.
    ['⊤ ? 0 Time()'],
])('warms up stream in non-chosen branch: %s', (code) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluator.start();
    expect(nonReactionStreamCount(evaluator)).toBeGreaterThan(0);
    evaluator.stop();
});

/**
 * Behavioral test: a stream in a skipped case key must still be registered
 * as a real dependency, so when it fires the program survives and the match
 * re-evaluates without losing the chosen result. Case 0 (1ms == 1ms) always
 * matches, so case 1's key (Time()) is never reached by the normal
 * evaluation path. Without warmup, the Time stream wouldn't exist at all,
 * the streamsByCreator lookup would fail, and stream.add() below would
 * throw.
 */
test('stream in a skipped case key is wired up as a real dependency', () => {
    const source = new Source(
        'test',
        '1ms ??? 1ms: "first" Time(): "via-time" "other"',
    );
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(project, DB, [DefaultLocale]);
    evaluator.start();

    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe('"first"');

    const stream = Array.from(evaluator.streamsByCreator.keys()).find(
        (s) => !(s instanceof Reaction),
    );
    expect(stream).not.toBeUndefined();

    const values = evaluator.streamsByCreator.get(stream!);
    expect(values).not.toBeUndefined();
    values![0].add(Time.make(source, 1), null);
    evaluator.flush();

    // Match value is constant 1ms, so case 0 still matches and the result is
    // unchanged — but the program is alive and reacting.
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe('"first"');

    evaluator.stop();
});
