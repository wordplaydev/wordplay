import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { node, type Grammar, type Replacement } from '@nodes/Node';
import PatternAtom from '@nodes/PatternAtom';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import { TextCloseByTextOpen } from '@parser/Tokenizer';

/**
 * The literal characters of a raw pattern-text token, with its delimiters
 * stripped (`"@foo"` → `@foo`, the unclosed `'ab` → `ab`).
 */
export function patternLiteralCharacters(token: Token): string {
    const raw = token.getText();
    if (raw.length === 0) return raw;
    const open = raw[0];
    const close = TextCloseByTextOpen[open];
    const inner = raw.slice(1);
    return close !== undefined && inner.endsWith(close)
        ? inner.slice(0, inner.length - close.length)
        : inner;
}

/**
 * A literal text atom in a pattern, e.g. `"-"` or `'"'`. Unlike a normal text
 * literal, this is RAW: the whole quoted span is a single {@link Sym.PatternText}
 * token (any delimiter, no escaping, no markup, no embedded expressions, no
 * `/lang` tag, no multiple translations). See LANGUAGE.md.
 */
export default class PatternLiteralText extends PatternAtom {
    readonly text: Token;

    constructor(text: Token) {
        super();
        this.text = text;
        this.computeChildren();
    }

    getDescriptor(): NodeDescriptor {
        return 'PatternLiteralText';
    }

    getGrammar(): Grammar {
        return [
            { name: 'text', kind: node(Sym.PatternText), label: undefined },
        ];
    }

    clone(replace?: Replacement) {
        return new PatternLiteralText(
            this.replaceChild('text', this.text, replace),
        ) as this;
    }

    /** The literal characters this atom matches (delimiters stripped). */
    getCharacters(): string {
        return patternLiteralCharacters(this.text);
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PatternLiteralText;
    getLocalePath() {
        return PatternLiteralText.LocalePath;
    }
}
