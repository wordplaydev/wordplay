import type Conflict from '#conflicts/Conflict.ts';
import { PossiblePII } from '#conflicts/PossiblePII.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { FORMATTED_SYMBOL } from '#parser/Symbols.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import type Context from '#nodes/Context.ts';
import Example from '#nodes/Example.ts';
import type Locales from '#locale/Locales.ts';
import Language from '#nodes/Language.ts';
import { LanguageTagged } from '#nodes/LanguageTagged.ts';
import Markup from '#nodes/Markup.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import { node, optional } from '#nodes/Node.ts';
import type Paragraph from '#nodes/Paragraph.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Words from '#nodes/Words.ts';

export default class FormattedTranslation extends LanguageTagged {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language: Language | undefined;
    readonly separator: Token | undefined;

    constructor(
        open: Token,
        markup: Markup,
        close: Token | undefined,
        lang: Language | undefined,
        separator: Token | undefined,
    ) {
        super();

        this.open = open;
        this.markup = markup;
        this.close = close;
        this.language = lang;
        this.separator = separator;

        this.computeChildren();
    }

    static make(content?: Paragraph[], language?: Language) {
        return new FormattedTranslation(
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            new Markup(content ?? []),
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            language,
            undefined,
        );
    }

    /** A formatted translation whose markup is a single link to the named custom
     *  character. Built with Markup.words so the markup carries spaces and can
     *  render as output. */
    static makeWithLink(name: string, language?: Language) {
        return new FormattedTranslation(
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            Markup.words(`@${name}`),
            new Token(FORMATTED_SYMBOL, Sym.Formatted),
            language,
            undefined,
        );
    }

    /** The empty translation, plus one linking to each available custom character. Each carries
     *  the primary locale's language tag: two adjacent untagged formatted translations print as
     *  `` `a``b` ``, which reparses as one, so the tag is what makes an appended one expressible. */
    static getPossibilities(
        characters: string[] | undefined,
        locales: Locales,
    ) {
        const language = Language.make(locales.getLocale().language);
        return [
            FormattedTranslation.make(undefined, language),
            ...(characters?.map((name) =>
                FormattedTranslation.makeWithLink(name, language),
            ) ?? []),
        ];
    }

    static getPossibleReplacements({ characters, locales }: ReplaceContext) {
        return FormattedTranslation.getPossibilities(characters, locales);
    }

    static getPossibleInsertions({ characters, locales }: InsertContext) {
        return FormattedTranslation.getPossibilities(characters, locales);
    }

    getDescriptor(): NodeDescriptor {
        return 'FormattedTranslation';
    }

    getExamples() {
        return this.markup
            .nodes()
            .filter(
                (example): example is Example => example instanceof Example,
            );
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Formatted), label: undefined },
            { name: 'markup', kind: node(Markup), label: undefined },
            { name: 'close', kind: node(Sym.Formatted), label: undefined },
            {
                name: 'language',
                kind: optional(node(Language)),
                label: () => (l) => l.glossary.language.word,
            },
            {
                name: 'separator',
                kind: optional(node(Sym.Separator)),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new FormattedTranslation(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('markup', this.markup, replace),
                this.replaceChild('close', this.close, replace),
                this.replaceChild('language', this.language, replace),
                this.replaceChild('separator', this.separator, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Text;
    }

    withLanguage(language: Language) {
        return new FormattedTranslation(
            this.open,
            this.markup,
            this.close,
            language,
            this.separator,
        );
    }

    getFirstParagraph(): string {
        const first: Paragraph | undefined = this.markup.paragraphs[0];
        return first === undefined
            ? ''
            : first
                  .nodes((n): n is Words => n instanceof Words)
                  .map((w) => w.toText())
                  .join();
    }

    computeConflicts(context: Context): Conflict[] {
        return PossiblePII.analyze(this, context);
    }

    static readonly LocalePath = (l: LocaleText) => l.node.FormattedTranslation;
    getLocalePath() {
        return FormattedTranslation.LocalePath;
    }

    getCharacter() {
        return Characters.Formatted;
    }
}
