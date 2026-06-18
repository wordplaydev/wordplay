import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

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
        return [{ name: 'rest', kind: node(Sym.PatternRest), label: undefined }];
    }

    clone(replace?: Replacement) {
        return new PatternRest(
            this.replaceChild('rest', this.rest, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternRest;
    getLocalePath() {
        return PatternRest.LocalePath;
    }
}
