import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import Language from '#nodes/Language.ts';
import { node, optional, type Grammar, type Replacement } from '#nodes/Node.ts';
import PatternAtom from '#nodes/PatternAtom.ts';
import PatternSequence from '#nodes/PatternSequence.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';

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
            {
                name: 'language',
                kind: optional(node(Language)),
                label: undefined,
            },
            { name: 'open', kind: node(Sym.EvalOpen), label: undefined },
            { name: 'body', kind: node(PatternSequence), label: undefined },
            { name: 'close', kind: node(Sym.EvalClose), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PatternCaseFold(
                this.replaceChild('fold', this.fold, replace),
                this.replaceChild('language', this.language, replace),
                this.replaceChild('open', this.open, replace),
                this.replaceChild('body', this.body, replace),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternCaseFold;
    getLocalePath() {
        return PatternCaseFold.LocalePath;
    }
}
