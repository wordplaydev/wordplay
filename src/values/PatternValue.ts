import type LocaleText from '@locale/LocaleText';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Expression from '@nodes/Expression';
import type PatternLiteral from '@nodes/PatternLiteral';
import PatternType from '@nodes/PatternType';
import { searchPattern, testPattern } from '@runtime/pattern/match';
import type { PatternMatch } from '@runtime/pattern/match';
import SimpleValue from '@values/SimpleValue';
import type Value from '@values/Value';

/**
 * The value of an evaluated {@link PatternLiteral}. Holds the source pattern
 * AST; the `≈`/`⌕` operators on Text apply it by walking that AST in
 * `@runtime/pattern/match.ts`. Walking happens stepwise (one Evaluator step per
 * grapheme probe) so a match is observable and single-steppable; see
 * matchSteps.ts. Equality is by source text, so two patterns that read the same
 * are equal.
 */
export default class PatternValue extends SimpleValue {
    readonly pattern: PatternLiteral;

    constructor(creator: Expression, pattern: PatternLiteral) {
        super(creator);
        this.pattern = pattern;
    }

    /** Whole-text test. */
    test(text: string): boolean {
        return testPattern(this.pattern, text);
    }

    /** Leftmost non-overlapping search. */
    search(text: string): PatternMatch[] {
        return searchPattern(this.pattern, text);
    }

    toWordplay() {
        return this.pattern.toWordplay();
    }

    getType() {
        return PatternType.make();
    }

    getBasisTypeName(): BasisTypeName {
        return 'pattern';
    }

    isEqualTo(value: Value) {
        return (
            value instanceof PatternValue &&
            this.pattern.toWordplay() === value.pattern.toWordplay()
        );
    }

    getDescription() {
        return (l: LocaleText) => l.term.pattern;
    }

    getRepresentativeText() {
        return this.toWordplay();
    }

    getSize() {
        return 1;
    }
}
