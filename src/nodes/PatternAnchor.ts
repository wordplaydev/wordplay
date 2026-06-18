import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { any, node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A zero-width text anchor in a pattern: `⊢` (start of text) or `⊣` (end of
 * text). See LANGUAGE.md.
 */
export default class PatternAnchor extends PatternAtom {
    readonly anchor: Token;

    constructor(anchor: Token) {
        super();
        this.anchor = anchor;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternAnchor';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'anchor',
                kind: any(node(Sym.PatternStart), node(Sym.PatternEnd)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternAnchor(
            this.replaceChild('anchor', this.anchor, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternAnchor;
    getLocalePath() {
        return PatternAnchor.LocalePath;
    }
}
