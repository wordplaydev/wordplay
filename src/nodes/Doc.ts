import type Conflict from '#conflicts/Conflict.ts';
import { PossiblePII } from '#conflicts/PossiblePII.ts';
import type { InsertContext } from '#edit/revision/EditContext.ts';
import type LanguageCode from '#locale/LanguageCode.ts';
import countWords from '#locale/countWords.ts';
import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import { getMultilingualLanguageLabel } from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import { DOCS_SYMBOL } from '#parser/Symbols.ts';
import { Purpose } from '#concepts/Purpose.ts';
import Characters from '../lore/BasisCharacters';
import type Context from '#nodes/Context.ts';
import Language from '#nodes/Language.ts';
import { LanguageTagged } from '#nodes/LanguageTagged.ts';
import Markup from '#nodes/Markup.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import { node, optional } from '#nodes/Node.ts';
import Paragraph from '#nodes/Paragraph.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import Words from '#nodes/Words.ts';

export default class Doc extends LanguageTagged {
    readonly open: Token;
    readonly markup: Markup;
    readonly close: Token | undefined;
    readonly language: Language | undefined;
    readonly separator: Token | undefined;

    constructor(
        open: Token,
        markup: Markup,
        close: Token | undefined,
        lang: Language | undefined = undefined,
        separator: Token | undefined = undefined,
    ) {
        super();

        this.open = open;
        this.markup = markup;
        this.close = close;
        this.language = lang;
        this.separator = separator;

        this.computeChildren();
    }

    static make(content?: Paragraph[], lang: Language | undefined = undefined) {
        return new Doc(
            new Token(DOCS_SYMBOL, Sym.Doc),
            new Markup(content ?? []),
            new Token(DOCS_SYMBOL, Sym.Doc),
            lang,
            undefined,
        );
    }

    static getTemplate(locales: Locales) {
        return Doc.make([
            new Paragraph([
                Words.make(
                    locales.getMultilingualText((l) => l.node.Words.name),
                ),
            ]),
        ]);
    }

    static getPossibleReplacements() {
        return [];
    }

    static getPossibleInsertions({ locales }: InsertContext) {
        return [Doc.getTemplate(locales)];
    }

    getDescriptor(): NodeDescriptor {
        return 'Doc';
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Sym.Doc), label: undefined },
            {
                name: 'markup',
                kind: node(Markup),
                label: undefined,
            },
            { name: 'close', kind: node(Sym.Doc), label: undefined },
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
            new Doc(
                this.replaceChild('open', this.open, replace),
                this.replaceChild('markup', this.markup, replace),
                this.replaceChild('close', this.close, replace),
                this.replaceChild('language', this.language, replace),
                this.replaceChild('separator', this.separator, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    withMarkup(markup: Markup) {
        return new Doc(
            this.open,
            markup,
            this.close,
            this.language,
            this.separator,
        );
    }

    withLanguage(language: Language) {
        return new Doc(this.open, this.markup, this.close, language);
    }

    hasLanguage() {
        return this.language !== undefined;
    }

    isLanguage(language: LanguageCode) {
        return this.language?.getLanguageCode() === language;
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

    /**
     * This doc's language, named in its own language ("Español", not "es"), or
     * undefined if it has no tag. Falls back to the raw tag text for a code we
     * have no name for, so an unrecognized tag still says something.
     */
    getLanguageName(): string | undefined {
        const tag = this.language?.getTagString();
        if (tag === undefined) return undefined;
        const label = getMultilingualLanguageLabel(tag);
        return label.length > 0 ? label : tag;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Doc;
    getLocalePath() {
        return Doc.LocalePath;
    }

    getDescriptionInputs(locales: Locales): Record<string, TemplateInput> {
        return {
            language: this.getLanguageName(),
            // Segmented in the doc's own language: Chinese and Japanese have no
            // spaces, so a whitespace split would count one word per sentence.
            words: countWords(
                this.markup.toText(),
                this.language?.getBCP47() ?? locales.getLocaleString(),
            ),
        };
    }

    getCharacter() {
        return Characters.Doc;
    }
}
