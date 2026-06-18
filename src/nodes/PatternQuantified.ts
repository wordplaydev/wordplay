import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { any, node, type Grammar, type Replacement } from '@nodes/Node';
import PatternNode from '@nodes/PatternNode';
import PatternAtom from '@nodes/PatternAtom';
import PatternComplement from '@nodes/PatternComplement';
import PatternQuantifier from '@nodes/PatternQuantifier';

/**
 * A quantified atom in a pattern, e.g., `3 #` or `>0 (◌ | #)`. A quantifier
 * applies to exactly one atom (group to combine). See LANGUAGE.md–§3.
 */
export default class PatternQuantified extends PatternNode {
    readonly quantifier: PatternQuantifier;
    readonly atom: PatternNode;

    constructor(quantifier: PatternQuantifier, atom: PatternNode) {
        super();
        this.quantifier = quantifier;
        this.atom = atom;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternQuantified';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'quantifier',
                kind: node(PatternQuantifier),
                label: undefined,
            },
            {
                // A quantifier applies to an atom or a complemented atom
                // (`2 ~#`), but not another quantifier/capture — matching
                // parsePatternItem.
                name: 'atom',
                kind: any(node(PatternAtom), node(PatternComplement)),
                label: undefined,
                space: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternQuantified(
            this.replaceChild('quantifier', this.quantifier, replace),
            this.replaceChild('atom', this.atom, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternQuantified;
    getLocalePath() {
        return PatternQuantified.LocalePath;
    }
}
