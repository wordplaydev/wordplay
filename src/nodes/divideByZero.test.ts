import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import DefaultLocales from '@locale/DefaultLocales';
import Source from '@nodes/Source';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Reaction from '@nodes/Reaction';
import Templates from '@concepts/Templates';
import evaluateCode from '@runtime/evaluate';

function analyze(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return { source, context: project.getContext(source) };
}

/** The inferred type (in Wordplay text) of the last binary operation in the code. */
function lastBinaryType(code: string): string {
    const { source, context } = analyze(code);
    const bins = [...source.nodes()].filter(
        (n): n is BinaryEvaluate => n instanceof BinaryEvaluate,
    );
    return bins[bins.length - 1].getType(context).toWordplay();
}

/** All conflict explanations across the program that mention divide-by-zero, with their suggested fixes. */
function divideByZeroConflicts(code: string): { fixes: string[] }[] {
    const { source, context } = analyze(code);
    const out: { fixes: string[] }[] = [];
    for (const node of source.nodes())
        for (const conflict of node.getConflicts(context)) {
            const explanation =
                conflict
                    .getMessage(context, Templates)
                    .explanation(DefaultLocales, context)
                    .toText() ?? '';
            if (explanation.toLowerCase().includes('divide by zero'))
                out.push({
                    fixes: conflict
                        .getResolutions(context, [])
                        .map((r) => {
                            if (r.kind !== 'repair') return '';
                            try {
                                return (
                                    r
                                        .mediator(context, DefaultLocales)
                                        .newNode?.toWordplay() ?? ''
                                );
                            } catch {
                                return '';
                            }
                        }),
                });
        }
    return out;
}

// Runtime: dividing or taking a remainder by zero yields ø, never a silent NaN.
test('÷ and % by zero evaluate to ø', () => {
    expect(evaluateCode('1 ÷ 0')?.toString()).toBe('ø');
    expect(evaluateCode('1 % 0')?.toString()).toBe('ø');
    // Non-zero divisors are unaffected.
    expect(evaluateCode('10 ÷ 2')?.toString()).toBe('5');
    expect(evaluateCode('10 % 3')?.toString()).toBe('1');
});

// Types: ÷/% declare # | ø, narrowed to # when the divisor is provably non-zero.
test.each([
    ['10 ÷ 2', '#'],
    ['10 % 5', '#'],
    ['10 ÷ 0', '#|ø'],
    ['n: 2\n10 ÷ n', '#'],
    ['10 ÷ [1 2 3].length()', '#'],
    ['10 ÷ [].length()', '#|ø'],
    ['count: [].length()\n10 % count', '#|ø'],
])('type of %s is %s', (code, expected) => {
    expect(lastBinaryType(code)).toBe(expected);
});

// Unsafe division (divisor could be zero) produces a dedicated divide-by-zero
// conflict whose fix wraps the division in `?? <default>`.
test('unsafe division conflicts with a ?? fix', () => {
    const conflicts = divideByZeroConflicts(
        'count: [].length()\nx: 10 ÷ count\nx + 1',
    );
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts.some((c) => c.fixes.some((f) => f === '10÷count??1'))).toBe(
        true,
    );
});

// A provably-non-zero divisor never produces a divide-by-zero conflict.
test('safe division has no conflict', () => {
    expect(divideByZeroConflicts('x: 10 ÷ 2\nx + 1')).toHaveLength(0);
});

// A self-referential reaction whose recurrence can be ø is typed # | ø, and an
// unsafe use of its value is flagged with a fix targeting the division.
test('self-referential reaction surfaces divide-by-zero', () => {
    const { source, context } = analyze(
        'count: [].length()\nhead: 0 … ∆ Time(10ms) … (head + 1) % count\nhead - 1',
    );
    const reaction = [...source.nodes()].find(
        (n): n is Reaction => n instanceof Reaction,
    );
    expect(reaction?.getType(context).toWordplay()).toBe('#|ø');

    const conflicts = divideByZeroConflicts(
        'count: [].length()\nhead: 0 … ∆ Time(10ms) … (head + 1) % count\nhead - 1',
    );
    expect(
        conflicts.some((c) => c.fixes.some((f) => f === '(head+1)%count??1')),
    ).toBe(true);
});

// A reaction with no divide-by-zero stays a plain number and conflict-free.
test('safe reaction recurrence is not flagged', () => {
    const { source, context } = analyze('a: 1 … ∆ Time() … a + 1\na');
    const reaction = [...source.nodes()].find(
        (n): n is Reaction => n instanceof Reaction,
    );
    expect(reaction?.getType(context).toWordplay()).toBe('#');
    expect(
        divideByZeroConflicts('a: 1 … ∆ Time() … a + 1\na'),
    ).toHaveLength(0);
});
