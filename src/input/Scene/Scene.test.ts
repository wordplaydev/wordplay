import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Button from '@input/Button/Button';
import Spotlight from '@input/Spotlight/Spotlight';
import Key from '@input/Key/Key';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluator from '@runtime/Evaluator';
import BoolValue from '@values/BoolValue';
import NumberValue from '@values/NumberValue';
import StructureValue from '@values/StructureValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import Scene from './Scene';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function play(code: string) {
    const project = Project.make(
        null,
        't',
        new Source('t', code),
        [],
        DefaultLocale,
    );
    // Reactive and playing: StreamValue.add() drops values while stepping.
    const evaluator = new Evaluator(project, DB, [DefaultLocale], true);
    evaluator.start();
    return evaluator;
}

/** What the scene is showing, by the text of the phrase it is on. */
function showing(evaluator: Evaluator): string | undefined {
    const value: Value | undefined = evaluator
        .getBasisStreamsOfType(Scene)[0]
        ?.latest();
    if (!(value instanceof StructureValue)) return undefined;
    const text = value.resolve('text');
    return text instanceof TextValue ? text.text : undefined;
}

type Slate = {
    scene: string | undefined;
    index: number | undefined;
    total: number | undefined;
    lap: number | undefined;
    waiting: boolean | undefined;
};

/** What the program's first Spotlight is reporting. */
function slate(evaluator: Evaluator): Slate {
    const value: Value | undefined = evaluator
        .getBasisStreamsOfType(Spotlight)[0]
        ?.latest();
    const field = (name: string): Value | undefined =>
        value instanceof StructureValue ? value.resolve(name) : undefined;
    const text = field('scene');
    const index = field('index');
    const total = field('total');
    const lap = field('lap');
    const waiting = field('waiting');
    return {
        scene: text instanceof TextValue ? text.text : undefined,
        index: index instanceof NumberValue ? index.toNumber() : undefined,
        total: total instanceof NumberValue ? total.toNumber() : undefined,
        lap: lap instanceof NumberValue ? lap.toNumber() : undefined,
        waiting: waiting instanceof BoolValue ? waiting.bool : undefined,
    };
}

/** A key press, for a scene waiting on something other than a click. */
function press(evaluator: Evaluator, key: string) {
    evaluator.singletonReact(Key, (stream) =>
        stream.react({ key, down: true }),
    );
}

/** A click, which is what every condition in these scenes waits on. */
function click(evaluator: Evaluator) {
    evaluator.singletonReact(Button, (stream) => stream.react(true));
}

// What a scene has always done, and what nothing tested until now.

test('a scene shows each output for its duration and stops on the last', () => {
    const evaluator = play(`Scene([
        Phrase('a' duration: 1s)
        Phrase('b' duration: 1s)
        Phrase('c' duration: 1s)
    ])`);
    expect(showing(evaluator)).toBe('a');
    vi.advanceTimersByTime(1000);
    expect(showing(evaluator)).toBe('b');
    vi.advanceTimersByTime(1000);
    expect(showing(evaluator)).toBe('c');
    // Nothing after the last, since this scene isn't looping.
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('c');
    evaluator.stop();
});

test('a false condition holds the scene until it becomes true', () => {
    const evaluator = play(`click: ∆ Button()
Scene([Phrase('a' duration: 1s) click Phrase('b' duration: 1s)])`);
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('a');
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    evaluator.stop();
});

test('an output with an entry animation waits for it rather than for a clock', () => {
    // Nothing animates here, so this is really asserting which of the two ways
    // of moving on the scene chose: the timer would have fired long ago.
    const evaluator = play(`Scene([
        Phrase('a' duration: 1s entering: Pose(opacity: 0))
        Phrase('b' duration: 1s)
    ])`);
    expect(showing(evaluator)).toBe('a');
    vi.advanceTimersByTime(10000);
    expect(showing(evaluator)).toBe('a');
    evaluator.stop();
});

// Looping (#547).

test('a looping scene comes back around and counts its laps', () => {
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a' duration: 1s) Phrase('b' duration: 1s)] loop: ⊤)`);
    expect(showing(evaluator)).toBe('a');
    expect(slate(evaluator).lap).toBe(0);
    vi.advanceTimersByTime(2000);
    expect(showing(evaluator)).toBe('a');
    expect(slate(evaluator).lap).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(slate(evaluator).lap).toBe(2);
    evaluator.stop();
});

test('loop is read every evaluation, so a loop can be ended as well as begun', () => {
    const evaluator = play(`stop: ⊥ … ∆ Button() … ⊤
Scene([Phrase('a' duration: 1s) Phrase('b' duration: 1s)] loop: ~stop)`);
    vi.advanceTimersByTime(2000);
    expect(showing(evaluator)).toBe('a');
    click(evaluator);
    // It finishes the lap it is on and then stays on the last output.
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('b');
    evaluator.stop();
});

test('a lap that waits for nothing does not come around', () => {
    // Every output is instant, so going round would re-run the program as fast
    // as the machine allows, forever.
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a' duration: 0s) Phrase('b' duration: 0s)] loop: ⊤)`);
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('b');
    expect(slate(evaluator).lap).toBe(0);
    evaluator.stop();
});

test('a list of nothing but true conditions terminates', () => {
    // The walk used to recurse, and this is the shape that ran it off the stack.
    const evaluator = play(`Scene([⊤ ⊤ ⊤] loop: ⊤)`);
    vi.advanceTimersByTime(1000);
    expect(evaluator.getBasisStreamsOfType(Scene).length).toBe(1);
    evaluator.stop();
});

// Waiting on a condition after every output.

test('until holds after each output and lets go when it becomes true', () => {
    const evaluator = play(`Scene([
        Phrase('a' duration: 1s)
        Phrase('b' duration: 1s)
        Phrase('c')
    ] until: ∆ Button())`);
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('a');
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('b');
    click(evaluator);
    expect(showing(evaluator)).toBe('c');
    evaluator.stop();
});

test("until waits after an output's own time rather than instead of it", () => {
    const evaluator = play(
        `Scene([Phrase('a' duration: 1s) Phrase('b')] until: ∆ Button())`,
    );
    // The second is still counting down, so this asks it to move on too early.
    click(evaluator);
    expect(showing(evaluator)).toBe('a');
    vi.advanceTimersByTime(1000);
    expect(showing(evaluator)).toBe('a');
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    evaluator.stop();
});

test('a condition written in the list waits as well as until', () => {
    const evaluator = play(`gate: ⊥ … ∆ Key() … ⊤
Scene([Phrase('a' duration: 1s) gate Phrase('b')] until: ∆ Button())`);
    vi.advanceTimersByTime(1000);
    click(evaluator);
    // Past the first output, and now standing at the condition.
    expect(showing(evaluator)).toBe('a');
    press(evaluator, 'x');
    expect(showing(evaluator)).toBe('b');
    evaluator.stop();
});

test('a spotlight says a scene held by until is waiting', () => {
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a' duration: 1s) Phrase('b')] until: ∆ Button())`);
    expect(slate(evaluator).waiting).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(slate(evaluator).waiting).toBe(true);
    click(evaluator);
    expect(slate(evaluator).waiting).toBe(false);
    evaluator.stop();
});

test('a scene that waits for something still comes around', () => {
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a' duration: 1s) Phrase('b' duration: 1s)]
    loop: ⊤ until: ∆ Button())`);
    vi.advanceTimersByTime(1000);
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    vi.advanceTimersByTime(1000);
    click(evaluator);
    expect(showing(evaluator)).toBe('a');
    expect(slate(evaluator).lap).toBe(1);
    evaluator.stop();
});

// Moving by a distance rather than to a place.

test('step moves forward and back from wherever the scene is', () => {
    const forward = play(`Scene([Phrase('a') Phrase('b') Phrase('c')]
    pause: ⊤ step: ∆ Button() ? 1 ø)`);
    click(forward);
    expect(showing(forward)).toBe('b');
    click(forward);
    expect(showing(forward)).toBe('c');
    // Stopped at the end, not come around.
    click(forward);
    expect(showing(forward)).toBe('c');
    forward.stop();

    const back = play(`Scene([Phrase('a') Phrase('b') Phrase('c')]
    pause: ⊤ step: ∆ Button() ? -1 ø)`);
    // Already at the first, so back goes nowhere.
    click(back);
    expect(showing(back)).toBe('a');
    back.stop();
});

test('step comes around when the ends are joined', () => {
    const evaluator = play(`Scene([Phrase('a') Phrase('b')]
    loop: ⊤ pause: ⊤ step: ∆ Button() ? 1 ø)`);
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    click(evaluator);
    expect(showing(evaluator)).toBe('a');
    evaluator.stop();
});

test('sending a scene where it already is does nothing', () => {
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a' duration: 1s) Phrase('b')]
    pause: ⊤ step: ∆ Button() ? 0 ø)`);
    click(evaluator);
    expect(showing(evaluator)).toBe('a');
    expect(slate(evaluator).index).toBe(1);
    evaluator.stop();
});

test('replay beats go, and go beats step', () => {
    // Both ask at once; the larger instruction is the one that happens.
    const overGo = play(`Scene([Phrase('a') Phrase('b') Phrase('c')]
    pause: ⊤ go: ∆ Button() ? 3 ø step: ∆ Button() ? 1 ø)`);
    click(overGo);
    expect(showing(overGo)).toBe('c');
    overGo.stop();

    const overReplay = play(`Scene([
        Phrase('a' duration: 1s)
        Phrase('b' duration: 1s)
        Phrase('c')
    ] replay: ∆ Button() go: ∆ Button() ? 3 ø)`);
    vi.advanceTimersByTime(1000);
    expect(showing(overReplay)).toBe('b');
    click(overReplay);
    expect(showing(overReplay)).toBe('a');
    overReplay.stop();
});

// Replay, pause, and go.

test('replay starts the scene over and resets its lap', () => {
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a' duration: 1s) Phrase('b' duration: 1s)]
    loop: ⊤ replay: ∆ Button())`);
    vi.advanceTimersByTime(3000);
    expect(showing(evaluator)).toBe('b');
    expect(slate(evaluator).lap).toBe(1);
    click(evaluator);
    expect(showing(evaluator)).toBe('a');
    expect(slate(evaluator).lap).toBe(0);
    evaluator.stop();
});

test('pause holds the scene, and letting go finishes the time that was left', () => {
    const evaluator = play(`held: ⊥ … ∆ Button() … ~held
Scene([Phrase('a' duration: 1s) Phrase('b' duration: 1s)] pause: held)`);
    vi.advanceTimersByTime(400);
    click(evaluator);
    expect(showing(evaluator)).toBe('a');
    // Held, so no amount of time moves it.
    vi.advanceTimersByTime(10000);
    expect(showing(evaluator)).toBe('a');
    click(evaluator);
    // 600ms of the second was left, not a whole second.
    vi.advanceTimersByTime(500);
    expect(showing(evaluator)).toBe('a');
    vi.advanceTimersByTime(200);
    expect(showing(evaluator)).toBe('b');
    evaluator.stop();
});

test('a scene told to pause still arrives at its first output', () => {
    const evaluator = play(`at: Spotlight()
Scene([Phrase('a') Phrase('b')] pause: ⊤)`);
    // Arriving is not advancing, and a spotlight has to agree with what is shown.
    expect(showing(evaluator)).toBe('a');
    expect(slate(evaluator).index).toBe(1);
    expect(slate(evaluator).waiting).toBe(true);
    // And it stays there, however long anyone waits.
    vi.advanceTimersByTime(10000);
    expect(showing(evaluator)).toBe('a');
    evaluator.stop();
});

test('go sends the scene to an output by position', () => {
    const evaluator = play(`Scene([Phrase('a') Phrase('b') Phrase('c')]
    pause: ⊤ go: ∆ Button() ? 3 ø)`);
    expect(showing(evaluator)).toBe('a');
    click(evaluator);
    expect(showing(evaluator)).toBe('c');
    evaluator.stop();
});

test('go sends the scene to an output by name', () => {
    const evaluator = play(`Scene([
        Phrase('a' name: 'first')
        Phrase('b' name: 'second')
    ] pause: ⊤ go: ∆ Button() ? 'second' ø)`);
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    evaluator.stop();
});

test('go stops at the ends, and comes around when the ends are joined', () => {
    const stopping = play(`Scene([Phrase('a') Phrase('b')]
    pause: ⊤ go: ∆ Button() ? 9 ø)`);
    click(stopping);
    expect(showing(stopping)).toBe('b');
    stopping.stop();

    const looping = play(`Scene([Phrase('a') Phrase('b')]
    loop: ⊤ pause: ⊤ go: ∆ Button() ? 9 ø)`);
    click(looping);
    // 9 outputs past the start of a two-output scene is the first one.
    expect(showing(looping)).toBe('a');
    looping.stop();
});

// What a Spotlight reports.

test('a spotlight counts outputs, never the conditions between them', () => {
    const evaluator = play(`click: ∆ Button()
at: Spotlight()
Scene([Phrase('a' duration: 1s) click Phrase('b' duration: 1s)])`);
    expect(slate(evaluator).index).toBe(1);
    expect(slate(evaluator).total).toBe(2);
    // Finish the first phrase, so the scene is standing at the condition.
    vi.advanceTimersByTime(1000);
    click(evaluator);
    expect(showing(evaluator)).toBe('b');
    expect(slate(evaluator).index).toBe(2);
    evaluator.stop();
});

test('a spotlight and its scene never disagree within one evaluation', () => {
    const evaluator = play(`at: Spotlight()
Scene([
    Phrase('a' duration: 1s)
    Phrase('b' duration: 1s)
    Phrase('c' duration: 1s)
])`);
    for (const [ms, text, index] of [
        [0, 'a', 1],
        [1000, 'b', 2],
        [1000, 'c', 3],
    ] as const) {
        vi.advanceTimersByTime(ms);
        expect(showing(evaluator)).toBe(text);
        expect(slate(evaluator).index).toBe(index);
    }
    evaluator.stop();
});

test('a spotlight waiting on a condition says so', () => {
    const evaluator = play(`click: ∆ Button()
at: Spotlight()
Scene([Phrase('a' duration: 1s) click Phrase('b')])`);
    expect(slate(evaluator).waiting).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(slate(evaluator).waiting).toBe(true);
    click(evaluator);
    expect(slate(evaluator).waiting).toBe(false);
    evaluator.stop();
});

test('a named spotlight hears only the scene it names', () => {
    const evaluator =
        play(`one: Scene([Phrase('a' duration: 1s) Phrase('b')] name: 'one')
two: Scene([Phrase('x' duration: 3s) Phrase('y')] name: 'two')
at: Spotlight('two')
Stage([one two])`);
    vi.advanceTimersByTime(1000);
    // The first scene has moved on; the spotlight follows the second, which has not.
    expect(slate(evaluator).scene).toBe('two');
    expect(slate(evaluator).index).toBe(1);
    vi.advanceTimersByTime(2000);
    expect(slate(evaluator).index).toBe(2);
    evaluator.stop();
});

test('a spotlight always has a mark, even before any scene has reported', () => {
    const evaluator = play(`Spotlight()`);
    expect(slate(evaluator).index).toBe(0);
    expect(slate(evaluator).total).toBe(0);
    evaluator.stop();
});

// Hardening.

test('a scene whose list shrinks under it does not throw', () => {
    const evaluator = play(`short: ⊥ … ∆ Button() … ⊤
Scene(short ?
    [Phrase('a' duration: 1s)]
    [Phrase('a' duration: 1s) Phrase('b' duration: 1s) Phrase('c' duration: 1s)])`);
    vi.advanceTimersByTime(2000);
    expect(showing(evaluator)).toBe('c');
    // The cursor is now past the end of the list it is handed.
    expect(() => click(evaluator)).not.toThrow();
    evaluator.stop();
});

test('a stopped scene stays stopped', () => {
    const evaluator = play(
        `Scene([Phrase('a' duration: 1s) Phrase('b' duration: 1s)])`,
    );
    evaluator.stop();
    vi.advanceTimersByTime(5000);
    expect(showing(evaluator)).toBe('a');
});
