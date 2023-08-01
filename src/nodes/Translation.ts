import Token from './Token';
import Language from './Language';
import Symbol from './Symbol';
import { node, type Grammar, type Replacement, optional } from './Node';
import type Locale from '@locale/Locale';
import Emotion from '../lore/Emotion';
import { TextDelimiters } from '../parser/Tokenizer';
import Purpose from '../concepts/Purpose';
import { LanguageTagged } from './LanguageTagged';

export const ESCAPE_REGEX = /\\(.)/g;

export default class Translation extends LanguageTagged {
    readonly text: Token;

    constructor(text: Token, language?: Language) {
        super(language);

        this.text = text;

        /** Unescape the text string */

        this.computeChildren();
    }

    static make(text?: string, language?: Language) {
        return new Translation(
            new Token(`'${text ?? ''}'`, Symbol.Text),
            language
        );
    }

    getGrammar(): Grammar {
        return [
            { name: 'text', kind: node(Symbol.Text) },
            { name: 'language', kind: optional(node(Language)) },
        ];
    }

    clone(replace?: Replacement): this {
        return new Translation(
            this.replaceChild('text', this.text, replace),
            this.replaceChild('language', this.language, replace)
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Value;
    }

    computeConflicts() {}

    /** Get the text, with any escape characters processed. */
    getText(): string {
        // Replace any escapes with the character they're escaping
        return unescaped(this.text.getText());
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Translation;
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

    adjust(direction: -1 | 1, locales: Locale[]): this | undefined {
        const text = this.getText();
        const last = text.codePointAt(text.length - 1);
        if (last !== undefined) {
            return Translation.make(
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
        text.length - (TextDelimiters.has(text.charAt(text.length - 1)) ? 1 : 0)
    );
}
