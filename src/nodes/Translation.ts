import { CharacterWarning } from '@conflicts/CharacterWarning';
import type Conflict from '@conflicts/Conflict';
import { PossiblePII } from '@conflicts/PossiblePII';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { Purpose } from '@concepts/Purpose';
import { Emotion } from '../lore/Emotion';
import { TextCloseByTextOpen, TextDelimiters } from '@parser/Tokenizer';
import type Context from '@nodes/Context';
import ConceptLink, { CharacterName, CodepointName } from '@nodes/ConceptLink';
import Example from '@nodes/Example';
import type Expression from '@nodes/Expression';
import Language from '@nodes/Language';
import { LanguageTagged } from '@nodes/LanguageTagged';
import {
    list,
    node,
    optional,
    type Grammar,
    type Replacement,
} from '@nodes/Node';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export const ESCAPE_REGEX = /\\(.)/g;

export type TranslationSegment = Token | Example | ConceptLink;

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

        this.computeChildren();
    }

    static make(text?: string, language?: Language) {
        return new Translation(
            new Token("'", Sym.Text),
            text && text.length > 0 ? [new Token(text, Sym.Words)] : [],
            new Token("'", Sym.Text),
            language,
            undefined,
        );
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions() {
        return [this.make('')];
    }

    getDescriptor(): NodeDescriptor {
        return 'Translation';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Text), label: undefined },
            {
                name: 'segments',
                kind: list(
                    true,
                    node(Sym.Words),
                    node(Example),
                    node(ConceptLink),
                ),
                label: () => (l) => l.node.Translation.label.segments,
            },
            { name: 'close', kind: node(Sym.Text), label: undefined },
            {
                name: 'language',
                kind: optional(node(Language)),
                label: () => (l) => l.term.language,
            },
            {
                name: 'separator',
                kind: optional(node(Sym.Separator)),
                label: undefined,
            },
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

    getPurpose() {
        return Purpose.Text;
    }

    computeConflicts(context: Context): Conflict[] {
        const conflicts: Conflict[] = PossiblePII.analyze(this, context);

        // Custom characters (CharacterName) and codepoints (CodepointName) now
        // render in plain text (#773). Other references (concept/UI/how doc
        // links) still can't render as output, so warn about those.
        if (
            this.segments.some(
                (segment) =>
                    segment instanceof ConceptLink &&
                    !Translation.rendersInText(segment),
            )
        )
            conflicts.push(new CharacterWarning(this));

        return conflicts;
    }

    /** Whether a reference resolves to something renderable in plain text output. */
    static rendersInText(link: ConceptLink): boolean {
        const parsed = ConceptLink.parse(link.getName());
        return (
            parsed instanceof CharacterName || parsed instanceof CodepointName
        );
    }

    /** Get the text, with any escape characters processed and references kept as-is. */
    getText(): string {
        return this.segments
            .map((segment) =>
                segment instanceof Token
                    ? unescaped(segment.getText())
                    : segment instanceof ConceptLink
                      ? segment.concept.getText()
                      : '',
            )
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
        return {
            text: this.getText(),
        };
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
