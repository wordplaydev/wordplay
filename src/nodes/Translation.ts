import Token from './Token';
import Language from './Language';
import Sym from './Sym';
import { node, type Grammar, type Replacement, optional, list } from './Node';
import Emotion from '../lore/Emotion';
import { TextCloseByTextOpen, TextDelimiters } from '../parser/Tokenizer';
import Purpose from '../concepts/Purpose';
import { LanguageTagged } from './LanguageTagged';
import Example from './Example';
import type Locales from '../locale/Locales';
import { PossiblePII } from '@conflicts/PossiblePII';
import type Conflict from '@conflicts/Conflict';
import type Context from './Context';
import type Expression from './Expression';

export const ESCAPE_REGEX = /\\(.)/g;

export type TranslationSegment = Token | Example;

export default class Translation extends LanguageTagged {
    readonly open: Token;
    readonly segments: TranslationSegment[];
    readonly close: Token | undefined;
    readonly separator: Token | undefined;

    constructor(
        open: Token,
        segments: TranslationSegment[],
        close: Token | undefined,
        language: Language | undefined = undefined,
        separator: Token | undefined = undefined,
    ) {
        super(language);

        this.open = open;
        this.segments = segments;
        this.close = close;
        this.separator = separator;

        /** Unescape the text string */

        this.computeChildren();
    }

    static make(text?: string, language?: Language) {
        return new Translation(
            new Token("'", Sym.Text),
            [new Token(text ?? '', Sym.Words)],
            new Token("'", Sym.Text),
            language,
            undefined,
        );
    }

    getDescriptor() {
        return 'Translation';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Text) },
            {
                name: 'segments',
                kind: list(true, node(Sym.Words), node(Example)),
            },
            { name: 'close', kind: node(Sym.Text) },
            { name: 'language', kind: optional(node(Language)) },
            { name: 'separator', kind: optional(node(Sym.Separator)) },
        ];
    }

    clone(replace?: Replacement): this {
        return new Translation(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('segments', this.segments, replace),
            this.replaceChild('close', this.close, replace),
            this.replaceChild('language', this.language, replace),
            this.replaceChild('separator', this.separator, replace),
        ) as this;
    }

    getPurpose(): Purpose {
        return Purpose.Value;
    }

    computeConflicts(context: Context): Conflict[] {
        return PossiblePII.analyze(this, context);
    }

    /** Get the text, with any escape characters processed. */
    getText(): string {
        return this.segments
            .filter((segment): segment is Token => segment instanceof Token)
            .map((token) => unescaped(token.getText()))
            .join('');
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Translation);
    }

    getExpressions(): Expression[] {
        return this.segments
            .filter((segment): segment is Example => segment instanceof Example)
            .map((example) => example.program.expression);
    }

    getGlyphs() {
        return {
            symbols: this.getDelimiters(),
            emotion: Emotion.excited,
        };
    }

    getDelimiters(): string {
        return (
            this.open.getText() +
            (this.close?.getText() ?? TextCloseByTextOpen[this.open.getText()])
        );
    }

    getDescriptionInputs() {
        return [this.getText()];
    }

    adjust(direction: -1 | 1): this | undefined {
        const text = this.getText();
        const last = text.codePointAt(text.length - 1);
        if (last !== undefined) {
            return Translation.make(
                text.substring(0, text.length - 1) +
                    String.fromCodePoint(last + direction),
                this.language,
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
            (TextDelimiters.has(text.charAt(text.length - 1)) ? 1 : 0),
    );
}
