import TextType from './TextType';
import Token from './Token';
import type Type from './Type';
import Text from '@runtime/Text';
import Language from './Language';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import Literal from './Literal';
import Emotion from '../lore/Emotion';
import Purpose from '../concepts/Purpose';
import type { NativeTypeName } from '../native/NativeConstants';
import { TEXT_DELIMITERS } from '../parser/Tokenizer';
import { TEMPLATE_SYMBOL } from '../parser/Symbols';

export const ESCAPE_REGEX = /\^(.)/g;

export default class TextLiteral extends Literal {
    /** The raw token in the program */
    readonly text: Token;

    readonly format?: Language;

    constructor(text: Token, format?: Language) {
        super();

        this.text = text;
        this.format = format;

        /** Unescape the text string */

        this.computeChildren();
    }

    static make(text?: string, format?: Language) {
        return new TextLiteral(
            new Token(`'${text ?? ''}'`, TokenType.Text),
            format
        );
    }

    getGrammar() {
        return [
            { name: 'text', types: [Token] },
            { name: 'format', types: [Language, undefined] },
        ];
    }

    clone(replace?: Replacement) {
        return new TextLiteral(
            this.replaceChild('text', this.text, replace),
            this.replaceChild('format', this.format, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
    }

    getAffiliatedType(): NativeTypeName {
        return 'text';
    }

    computeConflicts() {}

    computeType(): Type {
        return new TextType(this.text, this.format);
    }

    /** Get the text, with any escape characters processed. */
    getText(): string {
        // Replace any escapes with the character they're escaping
        return unescape(this.text.getText());
    }

    getValue(): Text {
        return new Text(
            this,
            undelimited(this.getText()),
            this.format === undefined ? undefined : this.format.getLanguage()
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
        return translation.node.TextLiteral.start;
    }

    getGlyphs() {
        return {
            symbols: this.text.getDelimiters(),
            emotion: Emotion.Excited,
        };
    }
}

export function unescaped(text: string) {
    return text.replaceAll(ESCAPE_REGEX, '$1');
}

export function undelimited(text: string) {
    return text.substring(
        1,
        text.length -
            (Object.hasOwn(
                TEXT_DELIMITERS,
                text.length === 0 ? '' : text.charAt(text.length - 1)
            ) || text.charAt(text.length - 1) === TEMPLATE_SYMBOL
                ? 1
                : 0)
    );
}
