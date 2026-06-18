import type Conflict from '@conflicts/Conflict';
import MalformedQuantifier from '@conflicts/MalformedQuantifier';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import {
    any,
    node,
    none,
    optional,
    type Grammar,
    type Replacement,
} from '@nodes/Node';
import PatternNode from '@nodes/PatternNode';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A quantifier count in a pattern: `N`, `N–M`, or an inequality `=N` `>N` `≥N`
 * `<N` `≤N`. See LANGUAGE.md. `low` is the (first) number; `relation` is the
 * optional inequality; `dash`/`high` form a `N–M` range.
 */
export default class PatternQuantifier extends PatternNode {
    readonly relation: Token | undefined;
    readonly low: Token;
    readonly dash: Token | undefined;
    readonly high: Token | undefined;

    constructor(
        relation: Token | undefined,
        low: Token,
        dash: Token | undefined,
        high: Token | undefined,
    ) {
        super();
        this.relation = relation;
        this.low = low;
        this.dash = dash;
        this.high = high;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternQuantifier';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'relation',
                kind: any(
                    node(Sym.PatternEqual),
                    node(Sym.PatternGreater),
                    node(Sym.PatternGreaterEqual),
                    node(Sym.PatternLess),
                    node(Sym.PatternLessEqual),
                    none(),
                ),
                label: undefined,
            },
            { name: 'low', kind: node(Sym.Number), label: undefined },
            { name: 'dash', kind: optional(node(Sym.PatternRange)), label: undefined },
            { name: 'high', kind: optional(node(Sym.Number)), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternQuantifier(
            this.replaceChild('relation', this.relation, replace),
            this.replaceChild('low', this.low, replace),
            this.replaceChild('dash', this.dash, replace),
            this.replaceChild('high', this.high, replace),
        ) as this;
    }

    computeConflicts(): Conflict[] {
        // A plain `N–M` range is unsatisfiable when min > max. Both bounds must
        // be present — an empty high (`3-`, mid-typing of `3-5`) is incomplete,
        // not malformed, so we don't flash a conflict while the range is typed.
        if (
            this.relation === undefined &&
            this.high !== undefined &&
            this.low.getText().length > 0 &&
            this.high.getText().length > 0
        ) {
            const low = Number(this.low.getText());
            const high = Number(this.high.getText());
            if (Number.isFinite(low) && Number.isFinite(high) && low > high)
                return [new MalformedQuantifier(this)];
        }
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternQuantifier;
    getLocalePath() {
        return PatternQuantifier.LocalePath;
    }
}
