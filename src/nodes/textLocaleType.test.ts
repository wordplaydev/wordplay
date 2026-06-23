import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluate from '@nodes/Evaluate';
import BinaryEvaluate from '@nodes/BinaryEvaluate';

function analyze(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return { source, context: project.getContext(source) };
}

/** The inferred type (in Wordplay text) of the last combine, whether written
 *  as the `+` operator (BinaryEvaluate) or `.combine()` (Evaluate). */
function lastCombineType(code: string): string {
    const { source, context } = analyze(code);
    const ops = [...source.nodes()].filter(
        (n): n is BinaryEvaluate | Evaluate =>
            n instanceof BinaryEvaluate || n instanceof Evaluate,
    );
    return ops[ops.length - 1].getType(context).toWordplay();
}

// The combine function derives its result locale by unioning operand locales,
// for both the operator and method-call forms.
test.each([
    // Shared locale is preserved.
    ['"a"/en + "b"/en', "''/en"],
    // Differing locales union (languages and regions).
    ['"a"/en + "b"/fr', "''/en_fr"],
    ['"a"/en-US + "b"/fr-CA', "''/en_fr-US_CA"],
    // The method-call form derives the same way.
    ['"a"/en.combine("b"/fr)', "''/en_fr"],
])('static type of %s is %s', (code, expected) => {
    expect(lastCombineType(code)).toBe(expected);
});

/** Count type-incompatibility conflicts on the program. */
function typeConflictCount(code: string): number {
    const { source, context } = analyze(code);
    let count = 0;
    for (const node of source.nodes())
        count += node.getConflicts(context).length;
    return count;
}

test('a matching locale annotation type-checks; a mismatched one conflicts', () => {
    // The derived locale (en) satisfies a `""/en` annotation.
    expect(typeConflictCount('x•""/en: "a"/en + "b"/en\nx')).toBe(0);
    // It does not satisfy a `""/fr` annotation.
    expect(
        typeConflictCount('x•""/fr: "a"/en + "b"/en\nx'),
    ).toBeGreaterThan(0);
});
