import { DB, Locales } from '@db/Database';
import Project from '@db/projects/Project';
import Button from '@input/Button/Button';
import Spotlight from '@input/Spotlight/Spotlight';
import Key from '@input/Key/Key';
import DefaultLocale from '@locale/DefaultLocale';
import Evaluator from '@runtime/Evaluator';
import { parseSerializedProject } from '../../examples/examples';
import fs from 'fs';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import type Value from '@values/Value';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

/**
 * The two shipped examples the transport was built for: a slide show that steps
 * both ways, and a story whose lines wait for different things. Each is read on
 * its own rather than through the corpus reader, so this costs two files rather
 * than seventy-five and stays out of the sweeps.
 */

/** The evaluator defers past 1000 steps once a frame's worth of time has gone,
 *  and there are no frames here, so finish without the limit. */
function settle(evaluator: Evaluator) {
    if (!evaluator.isDone()) evaluator.finish(false);
}

async function play(name: string) {
    const serialized = parseSerializedProject(
        fs.readFileSync(`static/examples/${name}.wp`, 'utf8'),
        name,
    );
    const project = await Project.deserialize(Locales, serialized);
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.start();
    settle(evaluator);
    return evaluator;
}

function index(evaluator: Evaluator): number | undefined {
    const value: Value | undefined = evaluator
        .getBasisStreamsOfType(Spotlight)[0]
        ?.latest();
    const at =
        value instanceof StructureValue ? value.resolve('index') : undefined;
    return at instanceof NumberValue ? at.toNumber() : undefined;
}

function press(evaluator: Evaluator, key: string) {
    evaluator.singletonReact(Key, (stream) =>
        stream.react({ key, down: true }),
    );
    settle(evaluator);
}

/** Let whatever is showing have its own time first. An `until` waits after an
 *  output's duration rather than instead of it, so a reader who takes a moment
 *  is the case worth testing; one who beats a quarter of a second isn't. */
function read(evaluator: Evaluator) {
    vi.advanceTimersByTime(1000);
    settle(evaluator);
}

test('SlideShow steps forward and back, and stops at its ends', async () => {
    const evaluator = await play('SlideShow');
    expect(index(evaluator)).toBe(1);
    // Back from the first slide goes nowhere.
    press(evaluator, 'ArrowLeft');
    expect(index(evaluator)).toBe(1);
    press(evaluator, 'ArrowRight');
    expect(index(evaluator)).toBe(2);
    press(evaluator, 'ArrowRight');
    expect(index(evaluator)).toBe(3);
    press(evaluator, 'ArrowLeft');
    expect(index(evaluator)).toBe(2);
    // Walk past the end; it stops on the last slide rather than coming around.
    for (let i = 0; i < 20; i++) press(evaluator, 'ArrowRight');
    expect(index(evaluator)).toBe(10);
    evaluator.stop();
});

test('JapaneseClass advances a sentence at a time and waits for a voice', async () => {
    const evaluator = await play('JapaneseClass');
    expect(index(evaluator)).toBe(1);
    for (const expected of [2, 3, 4, 5]) {
        read(evaluator);
        press(evaluator, 'a');
        expect(index(evaluator)).toBe(expected);
    }
    // Sentence 5 is one of the speaking ones, so a key does nothing there.
    read(evaluator);
    press(evaluator, 'a');
    expect(index(evaluator)).toBe(5);
    evaluator.stop();

    // A click moves the sentences a key would.
    const clicked = await play('JapaneseClass');
    read(clicked);
    clicked.singletonReact(Button, (stream) => stream.react(true));
    settle(clicked);
    expect(index(clicked)).toBe(2);
    clicked.stop();
});
