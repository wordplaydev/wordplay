import TextType from './TextType';
import Token from './Token';
import type Type from './Type';
import Text from '@runtime/Text';
import Language from './Language';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import Symbol from './Symbol';
import { node, type Grammar, type Replacement, optional } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Emotion from '../lore/Emotion';
import type { NativeTypeName } from '../native/NativeConstants';
import { TEXT_DELIMITERS } from '../parser/Tokenizer';
import { TEMPLATE_SYMBOL } from '../parser/Symbols';
import concretize from '../locale/concretize';

export const ESCAPE_REGEX = /\\(.)/g;

export default class TextLiteral extends Literal {
    /** The raw token in the program */
    readonly text: Token;
    readonly language?: Language;

    constructor(text: Token, format?: Language) {
        super();

        this.text = text;
        this.language = format;

        /** Unescape the text string */

        this.computeChildren();
    }

    static make(text?: string, language?: Language) {
        return new TextLiteral(
            new Token(`'${text ?? ''}'`, Symbol.Text),
            language
        );
    }

    static getPossibleNodes() {
        return [TextLiteral.make()];
    }

    getGrammar(): Grammar {
        return [
            { name: 'text', types: node(Symbol.Text) },
            { name: 'language', types: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement) {
        return new TextLiteral(
            this.replaceChild('text', this.text, replace),
            this.replaceChild('language', this.language, replace)
        ) as this;
    }

    getAffiliatedType(): NativeTypeName {
        return 'text';
    }

    computeConflicts() {}

    computeType(): Type {
        return new TextType(this.text, this.language);
    }

    /** Get the text, with any escape characters processed. */
    getText(): string {
        // Replace any escapes with the character they're escaping
        return unescaped(this.text.getText());
    }

    getValue(): Text {
        return new Text(
            this,
            undelimited(this.getText()),
            this.language === undefined
                ? undefined
                : this.language.getLanguage()
        );
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getStart() {
        return this.text;
    }

    getFinish() {
        return this.text;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.TextLiteral;
    }

    getStartExplanations(translation: Locale) {
        return concretize(translation, translation.node.TextLiteral.start);
    }

    getGlyphs() {
        return {
            symbols: this.text.getDelimiters(),
            emotion: Emotion.excited,
        };
    }

    getDescriptionInputs() {
        return [this.getText()];
    }

    adjust(direction: -1 | 1): this | undefined {
        const text = this.getValue().text;
        const last = text.codePointAt(text.length - 1);
        if (last !== undefined) {
            return TextLiteral.make(
                text.substring(0, text.length - 1) +
                    String.fromCodePoint(last + direction),
                this.language
            ) as this;
        }
        return undefined;
    }
}

export function unescaped(text: string) {
    return text.replaceAll(ESCAPE_REGEX, '$1');
}

export function undelimited(text: string) {
    return text.substring(
        1,
        text.length -
            (TEXT_DELIMITERS[text.charAt(0)] === text.charAt(text.length - 1) ||
            text.charAt(text.length - 1) === TEMPLATE_SYMBOL
                ? 1
                : 0)
    );
}
