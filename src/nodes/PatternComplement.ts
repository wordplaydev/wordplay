import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternNode from '#nodes/PatternNode.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

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
            {
                name: 'not',
                kind: node(Sym.PatternComplement),
                label: undefined,
            },
            { name: 'atom', kind: node(PatternAtom), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternComplement(
                this.replaceChild('not', this.not, replace),
                this.replaceChild('atom', this.atom, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternComplement;
    getLocalePath() {
        return PatternComplement.LocalePath;
    }
}
