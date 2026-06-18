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
 * A zero-width word-boundary atom `┊/‹lang›`, a segmentation boundary per the
 * locale's word segmenter. The locale is required. See LANGUAGE.md.
 */
export default class PatternWordEdge extends PatternAtom {
    readonly edge: Token;
    readonly language: Language;

    constructor(edge: Token, language: Language) {
        super();
        this.edge = edge;
        this.language = language;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternWordEdge';
    }

    getGrammar(): Grammar {
        return [
            { name: 'edge', kind: node(Sym.PatternWordEdge), label: undefined },
            { name: 'language', kind: node(Language), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternWordEdge(
            this.replaceChild('edge', this.edge, replace),
            this.replaceChild('language', this.language, replace),
        ) as this;
    }

    computeConflicts(): Conflict[] {
        return this.language.getLanguageText() === undefined
            ? [new MissingPatternLocale(this)]
            : [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternWordEdge;
    getLocalePath() {
        return PatternWordEdge.LocalePath;
    }
}
