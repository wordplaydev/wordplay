import ExpectedNextValue from '@conflicts/ExpectedNextValue';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Locales from '@locale/Locales';
import Source from '@nodes/Source';
import { describe, expect, test } from 'vitest';

const locales = new Locales(undefined as never, [DefaultLocale], DefaultLocale);

/** The code each of this conflict's repairs produces, in the order offered. */
function repairs(code: string): string[] {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    const context = project.getContext(source);
    const conflict = source.expression
        .nodes()
        .flatMap((node) => node.getConflicts(context))
        .find((c) => c instanceof ExpectedNextValue);
    if (conflict === undefined) return [];
    return conflict
        .getResolutions(context, [])
        .filter((r) => r.kind === 'repair')
        .map((r) =>
            r
                .mediator(context, locales)
                .newProject.getSources()[0]
                .getCode()
                .toString(),
        );
}

describe('a reaction between two numbers is probably a mistyped range', () => {
    test('the range swap is offered first, and the fill still follows', () => {
        // The stream symbol is one dot away from the range symbol, so `1…10` is far more
        // likely to be `1‥10` with a third dot than a reaction someone stopped writing.
        expect(repairs('1…10')).toEqual(['1 ‥ 10', '1 … 10 … _']);
    });

    test('a reaction between things that are not numbers only offers the fill', () => {
        // A range is numbers only, so suggesting one here would be noise.
        expect(repairs("'a'…'b'")).toEqual(["'a' … 'b' … _"]);
    });

    test('a reaction that is merely unfinished still reports nothing to swap', () => {
        // A real reaction has a stream to react to, so it never reaches this conflict.
        expect(repairs('1 … ∆ Time() … 2')).toEqual([]);
    });
});
