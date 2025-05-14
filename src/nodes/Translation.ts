import { CharacterWarning } from '@conflicts/CharacterWarning';
import type Conflict from '@conflicts/Conflict';
import { PossiblePII } from '@conflicts/PossiblePII';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Purpose from '../concepts/Purpose';
import Emotion from '../lore/Emotion';
import {
    ConceptRegExPattern,
    TextCloseByTextOpen,
    TextDelimiters,
} from '../parser/Tokenizer';
import type Context from './Context';
import Example from './Example';
import type Expression from './Expression';
import Language from './Language';
import { LanguageTagged } from './LanguageTagged';
import { list, node, optional, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';

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

    getDescriptor(): NodeDescriptor {
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

    static ConceptRegExPattern = new RegExp(ConceptRegExPattern, 'ug');

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = PossiblePII.analyze(this, context);

        if (Translation.ConceptRegExPattern.test(this.getText())) {
            conflicts.push(new CharacterWarning(this));
        }

        return conflicts;
    }

    /** Get the text, with any escape characters processed. */
    getText(): string {
        return this.segments
            .filter((segment): segment is Token => segment instanceof Token)
            .map((token) => unescaped(token.getText()))
            .join('');
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Translation;
    getLocalePath() {
        return Translation.LocalePath;
    }

    getExpressions(): Expression[] {
        return this.segments
            .filter((segment): segment is Example => segment instanceof Example)
            .map((example) => example.program.expression);
    }

    getCharacter() {
        return { symbols: this.getDelimiters(), emotion: Emotion.excited };
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
