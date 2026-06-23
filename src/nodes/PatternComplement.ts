import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternNode from '@nodes/PatternNode';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A complement/negation in a pattern, e.g., `~#` (a non-digit) or `~▸(…)`
 * (negative lookahead). The `~` applies to exactly one atom. See LANGUAGE.md.
 */
export default class PatternComplement extends PatternNode {
    readonly not: Token;
    readonly atom: PatternNode;

    constructor(not: Token, atom: PatternNode) {
        super();
        this.not = not;
        this.atom = atom;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternComplement';
    }

    getGrammar(): Grammar {
        return [
            { name: 'not', kind: node(Sym.PatternComplement), label: undefined },
            { name: 'atom', kind: node(PatternAtom), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternComplement(
            this.replaceChild('not', this.not, replace),
            this.replaceChild('atom', this.atom, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternComplement;
    getLocalePath() {
        return PatternComplement.LocalePath;
    }
}
