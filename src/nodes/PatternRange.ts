import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternNode from '@nodes/PatternNode';
import { patternLiteralCharacters } from '@nodes/PatternLiteralText';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

/**
 * A range inside a glyph set, e.g., `"a"–"z"`. Endpoints are raw pattern-text
 * literals, compared by Unicode scalar order (see LANGUAGE.md).
 */
export default class PatternRange extends PatternNode {
    readonly low: Token;
    readonly dash: Token;
    readonly high: Token;

    constructor(low: Token, dash: Token, high: Token) {
        super();
        this.low = low;
        this.dash = dash;
        this.high = high;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternRange';
    }

    getGrammar(): Grammar {
        return [
            { name: 'low', kind: node(Sym.PatternText), label: undefined },
            { name: 'dash', kind: node(Sym.PatternRange), label: undefined },
            { name: 'high', kind: node(Sym.PatternText), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternRange(
            this.replaceChild('low', this.low, replace),
            this.replaceChild('dash', this.dash, replace),
            this.replaceChild('high', this.high, replace),
        ) as this;
    }

    /** The low endpoint's literal characters. */
    getLow(): string {
        return patternLiteralCharacters(this.low);
    }

    /** The high endpoint's literal characters. */
    getHigh(): string {
        return patternLiteralCharacters(this.high);
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternRange;
    getLocalePath() {
        return PatternRange.LocalePath;
    }
}
