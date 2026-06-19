import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Language from '@nodes/Language';
import {
    node,
    optional,
    type Grammar,
    type Replacement,
} from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import PatternSequence from '@nodes/PatternSequence';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A case-folding scope `Aa(…)` (or `Aa/‹lang›(…)`) in a pattern, matching its
 * subpattern case-insensitively. Locale is optional (bare uses Unicode default
 * case folding). See LANGUAGE.md.
 */
export default class PatternCaseFold extends PatternAtom {
    readonly fold: Token;
    readonly language: Language | undefined;
    readonly open: Token;
    readonly body: PatternSequence;
    readonly close: Token | undefined;

    constructor(
        fold: Token,
        language: Language | undefined,
        open: Token,
        body: PatternSequence,
        close: Token | undefined,
    ) {
        super();
        this.fold = fold;
        this.language = language;
        this.open = open;
        this.body = body;
        this.close = close;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternCaseFold';
    }

    getGrammar(): Grammar {
        return [
            { name: 'fold', kind: node(Sym.PatternFold), label: undefined },
            { name: 'language', kind: optional(node(Language)), label: undefined },
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            { name: 'body', kind: node(PatternSequence), label: undefined },
            { name: 'close', kind: node(Sym.EvalClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternCaseFold(
            this.replaceChild('fold', this.fold, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('open', this.open, replace),
            this.replaceChild('body', this.body, replace),
            this.replaceChild('close', this.close, replace),
        ) as this;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternCaseFold;
    getLocalePath() {
        return PatternCaseFold.LocalePath;
    }
}
