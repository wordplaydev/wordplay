import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import { expect, test } from 'vitest';
import ExpectedCondition from '@conflicts/ExpectedCondition';
import DefaultLocales from '@locale/DefaultLocales';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import ExpectedNextValue from '@conflicts/ExpectedNextValue';
import ExpectedStream from '@conflicts/ExpectedStream';
import { testConflict } from '@conflicts/TestUtilities';
import { UnparsableConflict } from '@conflicts/UnparsableConflict';
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

// #1237: a stream passed into a function (via a `•…T` parameter) drives a reaction
// inside that function. Confirms the value→stream bridge survives argument-binding,
// so ∆ on the parameter resolves the caller's stream at runtime.
test('∆ on a stream passed into a function reacts (#1237)', () => {
    const { evaluator, source } = startReactive(
        `ƒ taps(event•…?) 0 … ∆ event … ⬚ + 1
taps(Button())`,
    );

    // The program's two result expressions (the ƒ definition and the call) render as a list,
    // so the counter shows as the second element.
    expect(evaluator.exception).toBeUndefined();
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe(
        '[ƒ taps() 0]',
    );

    evaluator.singletonReact(Button, (stream) => stream.react(true));
    expect(evaluator.exception).toBeUndefined();
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe(
        '[ƒ taps() 1]',
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
    [
        'reaction value + second name',
        `(i → '') + ' of ' + (n → '')`,
        '"2 of 5"',
    ],
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

test('a reaction without a second … has an optional nextdots field', () => {
    // parseReaction only reads a second `…` if one is there, per the grammar's
    // `('…' EXPRESSION)?`, so the field's kind has to accept the undefined it holds
    // — otherwise replacements through the field silently fail.
    const source = new Source('test', `1…${TRUE_SYMBOL} 2`);
    const reaction = source.nodes().find((node) => node instanceof Reaction);
    expect(reaction).toBeDefined();
    if (reaction === undefined) return;
    expect(reaction.nextdots).toBeUndefined();
    const field = reaction.getGrammar().find((f) => f.name === 'nextdots');
    expect(field?.kind.isOptional()).toBe(true);
    expect(field?.kind.allows(undefined)).toBe(true);
});

test.each([
    // A missing second `…` already parsed; a missing condition or next value now does too, so an
    // incomplete reaction reports which part it needs instead of unreadable code.
    ['1…', true, true],
    ['1…⊤', false, true],
    [`1…${TRUE_SYMBOL}…`, false, true],
    ['1… …2', true, false],
    [`1…${TRUE_SYMBOL} 2`, false, false],
    [`1…${TRUE_SYMBOL}…2`, false, false],
])(
    '%s is missing its condition: %s, its next value: %s',
    (code, missingCondition, missingNext) => {
        const source = new Source('test', code);
        const reaction = source
            .nodes()
            .find((node) => node instanceof Reaction);
        expect(reaction).toBeDefined();
        if (reaction === undefined) return;
        expect(Reaction.isMissing(reaction.condition)).toBe(missingCondition);
        expect(Reaction.isMissing(reaction.next)).toBe(missingNext);
    },
);

test.each([
    ['1…', ExpectedCondition],
    ['1…', ExpectedNextValue],
    [`1…${TRUE_SYMBOL}`, ExpectedNextValue],
])('%s reports %s', (code, conflict) => {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const conflicts = project.getConflicts();
    expect(conflicts.some((c) => c instanceof conflict)).toBe(true);
    // The gap is marked once: the Reaction names the missing part, so the generic "unreadable code"
    // conflict defers rather than marking the same spot again.
    expect(conflicts.some((c) => c instanceof UnparsableConflict)).toBe(false);
});

test('an incomplete reaction evaluates to its initial value and makes no stream', () => {
    // Without a condition there's nothing to say when to change, so the reaction can't react — but it
    // shouldn't take the program down with it while it's being written.
    const { evaluator, source } = startReactive('1 … ∆ Button()');
    expect(evaluator.getLatestSourceValue(source)?.toString()).toBe('1');
    expect(
        [...evaluator.streamsByCreator.keys()].some(
            (creator) => creator instanceof Reaction,
        ),
    ).toBe(false);
    // The Start action never ran, so nothing should have been left on the reaction stacks — a bare
    // Finish still calls evaluate(), which is where an unbalanced pair would show up.
    expect(evaluator.reactionDependencies).toHaveLength(0);
    expect(evaluator.exception).toBeUndefined();
    evaluator.stop();
});

test('repairing a missing condition selects the placeholder it inserted', () => {
    // The repair replaces the whole Reaction, so the node worth selecting is the placeholder inside
    // it, not the reaction — and it has to be the very instance in the revised tree, since a caret
    // holding an equal-but-different node selects nothing. Node.replaceChild splices a replacement in
    // by reference, which is what makes that work.
    const source = new Source('test', '1…');
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    project.analyze();
    const conflict = project
        .getConflicts()
        .find((c) => c instanceof ExpectedCondition);
    expect(conflict).toBeDefined();
    if (conflict === undefined) return;
    const context = project.getContext(source);
    const repair = conflict
        .getResolutions(context, [])
        .find((r) => r.kind === 'repair');
    expect(repair).toBeDefined();
    if (repair === undefined || repair.kind !== 'repair') return;

    const { newProject, newNode } = repair.mediator(context, DefaultLocales);
    const newSource = newProject.getSources()[0];
    expect(newSource.getCode().toString()).toBe('1 … _•?');
    expect(newNode).toBeInstanceOf(ExpressionPlaceholder);
    expect(newSource.nodes()).toContain(newNode);
});
