import { test, expect } from 'vitest';
import Project from '@db/projects/Project';
import DefaultLocale from '@locale/DefaultLocale';
import Source from '@nodes/Source';
import Evaluate from '@nodes/Evaluate';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import FormattedType from '@nodes/FormattedType';
import parseProgram from '@parser/parseProgram';
import { toTokens } from '@parser/toTokens';

function analyze(code: string) {
    const source = new Source('test', code);
    const project = Project.make(null, 'test', source, [], DefaultLocale);
    return { source, context: project.getContext(source) };
}

/** Inferred type (in Wordplay text) of the last combine, operator or method form. */
function lastCombineType(code: string): string {
    const { source, context } = analyze(code);
    const ops = [...source.nodes()].filter(
        (n): n is BinaryEvaluate | Evaluate =>
            n instanceof BinaryEvaluate || n instanceof Evaluate,
    );
    return ops[ops.length - 1].getType(context).toWordplay();
}

// Formatted combine derives its result locale by unioning operand locales, for
// both the operator and method-call forms (parity with Text).
test.each([
    ['`a`/en + `b`/en', '`…`/en'],
    ['`a`/en + `b`/fr', '`…`/en_fr'],
    ['`a`/en.combine(`b`/fr)', '`…`/en_fr'],
])('static type of %s is %s', (code, expected) => {
    expect(lastCombineType(code)).toBe(expected);
});

function typeConflictCount(code: string): number {
    const { source, context } = analyze(code);
    let count = 0;
    for (const node of source.nodes())
        count += node.getConflicts(context).length;
    return count;
}

test('a matching formatted-locale annotation type-checks; a mismatch conflicts', () => {
    expect(typeConflictCount('x•`…`/en: `a`/en + `b`/en\nx')).toBe(0);
    expect(
        typeConflictCount('x•`…`/fr: `a`/en + `b`/en\nx'),
    ).toBeGreaterThan(0);
});

test('a `…` annotation accepts a union of formatted types', () => {
    // The conditional's type is `…` | `…`; the annotation must accept it.
    expect(typeConflictCount('x•`…`: ⊤ ? `a` `b`\nx')).toBe(0);
});

test('`…`/en parses to a FormattedType carrying a language', () => {
    const program = parseProgram(toTokens('x•`…`/en: `a`\nx'));
    const formatted = program.nodes().find((n) => n instanceof FormattedType) as
        | FormattedType
        | undefined;
    expect(formatted).toBeDefined();
    expect(formatted?.language).toBeDefined();
});
