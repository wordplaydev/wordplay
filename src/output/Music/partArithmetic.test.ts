import { expect, test } from 'vitest';
import evaluateCode from '@runtime/evaluate';
import ExceptionValue from '@values/ExceptionValue';

/**
 * `Part.pitch` is a `[#semitones]`, and every guide that draws music does
 * arithmetic on it. The trap is that declaring a helper `•#` looks like it
 * settles the unit and doesn't: a bare `#` means *any* unit, not *no* unit
 * (`NumberType`'s `unit ?? (none !== undefined ? Unit.Empty : Unit.Any)`), so
 * a semitone value passes the declaration and only fails an operation later.
 *
 * Nothing we run in CI could see this. There is no conflict, so `analyzeCode`
 * — which is all `npm run locales` checks a program with — passes it. Even
 * evaluating the whole program passes, because at beat 0 no part is sounding,
 * the `sounding` filter is empty, and the arithmetic never runs. It throws
 * only once a note plays, in front of a learner.
 *
 * So this evaluates the arithmetic directly against a semitone-united number,
 * which is what `Part.pitch[1]` hands over the moment anything sounds.
 */
function evaluates(code: string): boolean {
    return !(evaluateCode(code) instanceof ExceptionValue);
}

test('a bare # accepts a united number rather than stripping it', () => {
    // The shape the how-to and the tutorial both use. Declaring `•#` is not
    // what makes this work, and believing it did is how the bug spread.
    expect(evaluates('ƒ height(p•#semitones)•# p\nheight(3semitones)')).toBe(
        true,
    );
    // …but the value is still in semitones, so unitless arithmetic on it fails.
    expect(
        evaluates('ƒ height(p•#semitones)•# p\n(height(3semitones) · 0.2) - 1'),
    ).toBe(false);
});

test('dividing by 1semitones is what makes the arithmetic work', () => {
    expect(
        evaluates(
            'ƒ height(p•#semitones)•# p ÷ 1semitones\n(height(3semitones) · 0.2) - 1',
        ),
    ).toBe(true);
    // And the result is a length Place can take, which the earlier form is not.
    expect(
        evaluates(
            'ƒ height(p•#semitones)•# p ÷ 1semitones\nPlace(0m ((height(3semitones) · 0.2) - 1) · 1m)',
        ),
    ).toBe(true);
});
