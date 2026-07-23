import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import { expect, test } from 'vitest';
import ExpectedStream from '@conflicts/ExpectedStream';
import { testConflict } from '@conflicts/TestUtilities';
import { DB } from '@db/Database';
import Project from '@db/projects/Project';
import Button from '@input/Button/Button';
import Choice from '@input/Choice/Choice';
import Time from '@input/Time/Time';
import DefaultLocale from '@locale/DefaultLocale';
import type Expression from '@nodes/Expression';
import Reaction from '@nodes/Reaction';
import Source from '@nodes/Source';
import ExceptionValue from '@values/ExceptionValue';

const makeOne = (creator: Expression) => Time.make(creator, 1);

test.each([
    // Check stream resolution.
    [`Time() > 0ms`, makeOne, [FALSE_SYMBOL, TRUE_SYMBOL]],
    // Check stream references.
    [`Time() + 500ms`, makeOne, ['500ms', '501ms']],
    // Check reaction binding.
    [`a: 1 … ∆ Time() … a + 1\na`, makeOne, ['1', '2']],
    // Check reactions in evaluations. The program returns a list of its two
    // non-Bind result expressions: the function definition and `b`.
    [
        `
        ƒ mult(a•# b•#) a × b
        b: mult(2 1 … ∆ Time() … 2)
        b
        `,
        makeOne,
        ['[ƒ mult() 2]', '[ƒ mult() 4]'],
    ],
    // Ensure that reactions are evaluated by count, just like other reactions.
    [
        `time: Time()\n['hi' 'ho'].translate(ƒ(val) val … ∆ time … 'no')`,
        makeOne,
        ['["hi" "ho"]', '["no" "no"]'],
    ],
    // Ensure that when time changes, we get a new random value
    // Phrase(∆ Time(1000ms) ? ["a" "b" "c" "d"].random() '')
    [
        `∆ Time() ? Random() 1`,
        makeOne,
        ['1', '0.7098480789645691', '0.9742682568175951'],
    ],
    // Ensure that time change in a list doesn't re-evaluate random in list
    [
        `[ Time() Random()][2]`,
        makeOne,
        ['0.7098480789645691', '0.7098480789645691'],
    ],
    // Ensure that time change in a list doesn't re-evaluate list random
    [`[ Time() [1 2 3].random()][2]`, makeOne, ['3', '3']],
])(
    'React to %s',
    (
        code: string,
        value: (expression: Expression) => Value,
        expectedValues: string[],
    ) => {
        // Make the project
        const source = new Source('test', code);
        const project = Project.make(null, 'test', source, [], DefaultLocale);
        // Specify a seed for testing purposes.
        const evaluator = new Evaluator(
            project,
            DB,
            [DefaultLocale],
            true,
            undefined,
            1,
        );

        // Start the evaluator
        evaluator.start();

        for (const expectedValue of expectedValues) {
            // Check the latest value of the source
            const actualInitial = evaluator.getLatestSourceValue(source);
            expect(actualInitial?.toString()).toBe(expectedValue);

            // Find the non-reaction stream created and add the requested value to it.
            const streams = Array.from(evaluator.streamsByCreator.keys()).find(
                (s) => !(s instanceof Reaction),
            );
            if (streams) {
                const values = evaluator.streamsByCreator.get(streams);
                if (values) {
                    const stream = values[0];
                    stream.add(value(source), null);
                }
                expect(values).not.toBeUndefined();
            } else expect(streams).not.toBeUndefined();

            // Manually flush reactions, since time is pooled.
            evaluator.flush();
        }

        evaluator.stop();
    },
);

testConflict('1 … ∆ Time() … 1 + ⬚', '1 … ⊤ … 1 + ⬚', Reaction, ExpectedStream);

/** Build a reactive evaluator around the given code and return it with its source. */
function startReactive(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const evaluator = new Evaluator(
        project,
        DB,
        [DefaultLocale],
        true,
        undefined,
        1,
    );
    evaluator.start();
    return { evaluator, source };
}

// Regression: ∆ over a REFERENCE to a stream-holding binding must keep resolving
// after an unrelated stream triggers a reevaluation. The evaluator's value→stream
// map was evicted per expression history, so a Button reevaluation could orphan
// the memoized Choice value that ∆ picked resolves through, producing a
// TypeException that silently stopped all streams.
test('∆ over a stream binding survives unrelated stream changes', () => {
    // The crucial shape: \`clicks\` references BOTH Button and picked, so it is
    // Button-dependent; a Button reevaluation evicts its expression history,
    // which used to delete the shared Choice value's stream mapping that
    // \`mode\`'s memoized ∆ picked still resolves through.
    const { evaluator, source } = startReactive(
        `picked: Choice()
t: Time()
mode: 'none' … ∆ picked … picked
clicks: 0 … (∆ Button()) & ~(∆ picked) … clicks + 1
mode`,
    );

    /** Simulate animation-frame time passing, as in a real project. */
    function tickTime(times: number) {
        for (let i = 0; i < times; i++) {
            evaluator
                .getBasisStreamsOfType(Time)[0]
                .add(Time.make(source, i + 1), i + 1);
            evaluator.flush();
        }
    }

    /** Simulate a pointer down on a selectable output, which fires both a
     *  Button event and a Choice event, as OutputView does. */
    function click(name: string) {
        evaluator.singletonReact(Button, (stream) => stream.react(true));
        evaluator.singletonReact(Choice, (stream) => stream.react(name));
    }

    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe('"none"');
    expect(evaluator.exception).toBeUndefined();

    // A click selection updates the mode.
    click('hum');
    expect(evaluator.exception).toBeUndefined();
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe('"hum"');

    // Time passes, as it does between user inputs in a real project.
    tickTime(3);

    // A second click must not corrupt ∆ picked's stream resolution: its Button
    // event reevaluates expressions that reference both streams, which used to
    // evict the shared Choice value's stream mapping and throw a TypeException.
    click('tap');
    expect(evaluator.exception).toBeUndefined();
    const afterClick = evaluator.getLatestSourceValue(source);
    expect(afterClick).not.toBeInstanceOf(ExceptionValue);
    expect(afterClick?.toString()).toBe('"tap"');

    // And the Choice stream must still be alive (the exception used to stop it).
    tickTime(2);
    click('hum');
    expect(evaluator.exception).toBeUndefined();
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe('"hum"');

    evaluator.stop();
});

// Same regression for ← (Previous), which resolves streams the same way.
test('← over a stream binding survives unrelated stream changes', () => {
    const { evaluator, source } = startReactive(
        `picked: Choice()
clicks: 0 … ∆ Button() … clicks + 1
← 1 picked`,
    );

    expect(evaluator.exception).toBeUndefined();

    evaluator.singletonReact(Choice, (stream) => stream.react('hum'));

    evaluator.singletonReact(Button, (stream) => stream.react(true));
    expect(evaluator.exception).toBeUndefined();
    expect(evaluator.getLatestSourceValue(source)).not.toBeInstanceOf(
        ExceptionValue,
    );

    evaluator.stop();
});

// Regression: an expression that combines a reaction-bound value with a SECOND
// distinct name produced the wrong value after a stream fired. `i` rendered as
// `n`'s value, and in the concatenation form the ' of ' literal vanished
// entirely, which is the signature of a value-stack misalignment in the
// reuse-prior-value fast path (Start/Finish must agree about skipping).
test.each([
    // [label, expression, expected after one Button press]
    ['reaction value alone', `i → ''`, '"2"'],
    ['same name twice', `(i → '') + (i → '')`, '"22"'],
    ['no reaction value', `(n → '') + (n → '')`, '"55"'],
    ['reaction value + literal', `(i → '') + ' of 5'`, '"2 of 5"'],
    ['reaction value + second name', `(i → '') + ' of ' + (n → '')`, '"2 of 5"'],
    ['second name first', `(n → '') + ' of ' + (i → '')`, '"5 of 2"'],
])('%s', (_label, expression, expected) => {
    const { evaluator, source } = startReactive(
        `n: 5
i•#: 1 … ∆ Button() … i + 1
${expression}`,
    );

    expect(evaluator.exception).toBeUndefined();

    evaluator.singletonReact(Button, (stream) => stream.react(true));

    expect(evaluator.exception).toBeUndefined();
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe(expected);

    evaluator.stop();
});

// Regression: Reaction's Start pushed a reaction-dependency frame that was never
// popped, so the stack grew without bound and every stream access after the first
// reaction was attributed to the oldest frame (both consumers indexed [0]).
test('reaction dependency frames are balanced across reactions', () => {
    const { evaluator } = startReactive(
        `picked: Choice()
clicks: 0 … ∆ Button() … clicks + 1
mode: 'none' … ∆ picked … picked
[clicks mode]`,
    );

    expect(evaluator.reactionDependencies).toHaveLength(0);

    for (let i = 0; i < 5; i++) {
        evaluator.singletonReact(Button, (stream) => stream.react(true));
        evaluator.singletonReact(Choice, (stream) => stream.react(`m${i}`));
        expect(evaluator.exception).toBeUndefined();
        // Every frame pushed while evaluating a reaction must be popped again.
        expect(evaluator.reactionDependencies).toHaveLength(0);
    }

    evaluator.stop();
});
