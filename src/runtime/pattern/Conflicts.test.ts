import DuplicateCaptureName from '@conflicts/DuplicateCaptureName';
import EmptyPattern from '@conflicts/EmptyPattern';
import MalformedQuantifier from '@conflicts/MalformedQuantifier';
import MissingPatternLocale from '@conflicts/MissingPatternLocale';
import OverlappingAlternatives from '@conflicts/OverlappingAlternatives';
import UndefinedBackreference from '@conflicts/UndefinedBackreference';
import UnrecognizedPatternProperty from '@conflicts/UnrecognizedPatternProperty';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import evaluateCode from '@runtime/evaluate';
import { describe, expect, test } from 'vitest';

/** The conflict constructor names a pattern program produces. */
function conflictKinds(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    return source.expression
        .getAllConflicts(context)
        .map((c) => c.constructor.name);
}

describe('pattern conflicts', () => {
    test('empty pattern', () => {
        expect(conflictKinds("'x' ≈ ⣿⣿")).toContain(EmptyPattern.name);
        expect(conflictKinds("'x' ≈ ⣿_⣿")).not.toContain(EmptyPattern.name);
    });

    test('unrecognized property', () => {
        expect(conflictKinds("'x' ≈ ⣿_/bogus⣿")).toContain(
            UnrecognizedPatternProperty.name,
        );
        expect(conflictKinds("'x' ≈ ⣿_/greek⣿")).not.toContain(
            UnrecognizedPatternProperty.name,
        );
    });

    test('malformed quantifier (min > max)', () => {
        expect(conflictKinds("'x' ≈ ⣿5–2 #⣿")).toContain(
            MalformedQuantifier.name,
        );
        expect(conflictKinds("'x' ≈ ⣿2–5 #⣿")).not.toContain(
            MalformedQuantifier.name,
        );
        // A typed hyphen works as the range dash (so `3-5` isn't a parse error)…
        expect(conflictKinds("'x' ≈ ⣿3-5 #⣿")).toEqual([]);
        expect(conflictKinds("'x' ≈ ⣿5-2 #⣿")).toContain(
            MalformedQuantifier.name,
        );
        // …and an incomplete range mid-typing (`3-`, empty high) is not yet
        // "malformed" — no conflict flashes while the second bound is typed.
        expect(conflictKinds("'x' ≈ ⣿3-⣿")).not.toContain(
            MalformedQuantifier.name,
        );
        // The hyphen still serves as a `/lang` region subtag separator.
        expect(conflictKinds("'x' ≈ ⣿▭/en-US⣿")).not.toContain('Unparsable');
    });

    test('duplicate capture name', () => {
        expect(conflictKinds("'x' ≈ ⣿a:(_) a:(#)⣿")).toContain(
            DuplicateCaptureName.name,
        );
        expect(conflictKinds("'x' ≈ ⣿a:(_) b:(#)⣿")).not.toContain(
            DuplicateCaptureName.name,
        );
    });

    test('undefined backreference (bare name not a capture or class)', () => {
        expect(conflictKinds("'x' ≈ ⣿bogus⣿")).toContain(
            UndefinedBackreference.name,
        );
        // A real backref (names a capture) is fine.
        expect(conflictKinds("'x' ≈ ⣿a:(_) a⣿")).not.toContain(
            UndefinedBackreference.name,
        );
        // A bare named class is fine.
        expect(conflictKinds("'x' ≈ ⣿linebreak⣿")).not.toContain(
            UndefinedBackreference.name,
        );
    });

    test('missing locale on word / word-edge', () => {
        expect(conflictKinds("'x' ≈ ⣿▭/⣿")).toContain(
            MissingPatternLocale.name,
        );
        expect(conflictKinds("'x' ≈ ⣿▭/en⣿")).not.toContain(
            MissingPatternLocale.name,
        );
    });

    test('overlapping literal alternatives (prefix), order-independent', () => {
        expect(conflictKinds('\'x\' ≈ ⣿"cat" | "cats"⣿')).toContain(
            OverlappingAlternatives.name,
        );
        expect(conflictKinds('\'x\' ≈ ⣿"cats" | "cat"⣿')).toContain(
            OverlappingAlternatives.name,
        );
        // distinct alternatives, or a non-pure-literal alternation: no warning
        expect(conflictKinds('\'x\' ≈ ⣿"cat" | "dog"⣿')).not.toContain(
            OverlappingAlternatives.name,
        );
        expect(conflictKinds('\'x\' ≈ ⣿"cat" | 2 #⣿')).not.toContain(
            OverlappingAlternatives.name,
        );
    });
});

/**
 * The pattern parser must be total: the editor reparses on every keystroke, so
 * incomplete/malformed patterns have to yield conflicts, never throw, and must
 * not swallow the closing `⣿` or the End token.
 */
describe('parser totality on malformed input', () => {
    const evaluate = (code: string) =>
        evaluateCode(code)?.toString() ?? 'undefined';

    test.each([
        "'x' ≈ ⣿◌/⣿", // property with no name
        "'x' ≈ ⣿◌/x=⣿", // property value missing
        "'x' ≈ ⣿▭⣿", // word with no locale
        "'x' ≈ ⣿┊⣿", // word-edge with no locale
        "'x' ≈ ⣿3⣿", // quantifier with no atom
        "'x' ≈ ⣿>⣿", // inequality with no count/atom
        '\'x\' ≈ ⣿3–"a"⣿', // malformed range
        "'x' ≈ ⣿~⣿", // complement with no atom
        "'x' ≈ ⣿x:⣿", // capture with no atom
        "'x' ≈ ⣿", // unclosed pattern
    ])('does not throw on %s', (code) => {
        expect(() => evaluate(code)).not.toThrow();
    });
});
