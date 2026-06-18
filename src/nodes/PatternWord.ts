import type Conflict from '@conflicts/Conflict';
import MissingPatternLocale from '@conflicts/MissingPatternLocale';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Language from '@nodes/Language';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import type Token from '@nodes/Token';

/**
 * A whole-word atom `▭/‹lang›`, segmented by the locale's word segmenter
 * (`Intl.Segmenter`). The locale is required (no implied locale). See
 * LANGUAGE.md.
 */
export default class PatternWord extends PatternAtom {
    readonly box: Token;
    readonly language: Language;

    constructor(box: Token, language: Language) {
        super();
        this.box = box;
        this.language = language;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternWord';
    }

    getGrammar(): Grammar {
        return [
            { name: 'box', kind: node(Sym.PatternWord), label: undefined },
            { name: 'language', kind: node(Language), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternWord(
            this.replaceChild('box', this.box, replace),
            this.replaceChild('language', this.language, replace),
        ) as this;
    }

    computeConflicts(): Conflict[] {
        return this.language.language === undefined
            ? [new MissingPatternLocale(this)]
            : [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternWord;
    getLocalePath() {
        return PatternWord.LocalePath;
    }
}
