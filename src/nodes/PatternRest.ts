import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

/**
 * The rest-of-input atom `…` in a pattern — a possessive run of any grapheme.
 * See LANGUAGE.md.
 */
export default class PatternRest extends PatternAtom {
    readonly rest: Token;

    constructor(rest: Token) {
        super();
        this.rest = rest;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternRest';
    }

    getGrammar(): Grammar {
        return [
            { name: 'rest', kind: node(Sym.PatternRest), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternRest(this.replaceChild('rest', this.rest, replace)),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternRest;
    getLocalePath() {
        return PatternRest.LocalePath;
    }
}
