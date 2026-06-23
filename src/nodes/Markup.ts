import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { BULLET_SYMBOL, MACHINE_TRANSLATED_SYMBOL } from '@parser/Symbols';
import type { FontWeight } from '@basis/Fonts';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import type { TemplateInput } from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import type { FormattedText } from '@output/Phrase';
import Spaces from '@parser/Spaces';
import { toMarkup } from '@parser/toMarkup';
import { getCodepointFromString } from '@unicode/getCodepoint';
import ConceptLink, { CharacterName, CodepointName } from '@nodes/ConceptLink';
import Content from '@nodes/Content';
import Example from '@nodes/Example';
import Node, { list, node, type Grammar, type Replacement } from '@nodes/Node';
import Paragraph, { type Segment } from '@nodes/Paragraph';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Words from '@nodes/Words';

export type MarkupMetadata = { unwritten: boolean; machineTranslated: boolean };

/**
 * To refer to an input, use a $, followed by the number of the input desired,
 * starting from 1.
 *
 *      "Hello, my name is $1"
 */
export default class Markup extends Content {
    readonly paragraphs: Paragraph[];
    readonly spaces: Spaces | undefined;
    readonly metadata:
        | { unwritten: boolean; machineTranslated: boolean }
        | undefined;

    constructor(
        content: Paragraph[],
        spaces: Spaces | undefined = undefined,
        metadata: MarkupMetadata | undefined = undefined,
    ) {
        super();

        this.paragraphs = content;
        this.spaces = spaces;
        this.metadata = metadata;

        this.computeChildren();
    }

    static words(text: string) {
        const [markup] = toMarkup(text);
        return markup;
    }

    /** Markup placeholder text, plus markup linking to each available custom
     *  character. These replace an empty markup placeholder (e.g. inside a
     *  formatted translation), so each must be a Markup to apply. We build them
     *  with Markup.words so they carry spaces — markup with no spaces can't be
     *  rendered as output (it shows "unable to render markup without spaces"). */
    static getPossibilities(
        locales: Locales,
        characters: string[] | undefined,
    ): Markup[] {
        return [
            Markup.words(locales.getUnannotatedText((l) => l.node.Markup.name)),
            ...(characters?.map((name) => Markup.words(`@${name}`)) ?? []),
        ];
    }

    static getPossibleReplacements({ locales, characters }: ReplaceContext) {
        return Markup.getPossibilities(locales, characters);
    }

    static getPossibleInsertions({ locales, characters }: InsertContext) {
        return Markup.getPossibilities(locales, characters);
    }

    getDescriptor(): NodeDescriptor {
        return 'Markup';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'paragraphs',
                kind: list(true, node(Paragraph)),
                label: () => (l) => l.node.Markup.label.paragraphs,
                newline: true,
                double: true,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Markup(
            this.replaceChild('paragraphs', this.paragraphs, replace),
            this.spaces,
        ) as this;
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    computeConflicts() {
        return [];
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Markup;

    getLocalePath() {
        return Markup.LocalePath;
    }

    getCharacter() {
        return Characters.Markup;
    }

    getDescriptionInputs() {
        return {
            count: this.paragraphs.length,
        };
    }

    getExamples(): Example[] {
        return this.paragraphs
            .map((p) => p.segments.filter((e) => e instanceof Example))
            .flat();
    }

    getNodeSegments() {
        return this.paragraphs
            .map((p) => p.segments.filter((e) => e instanceof Node))
            .flat();
    }

    concretize(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
    ): Markup | undefined {
        // Create an empty list of replacements which we'll recursively fill and then update space with.
        const replacements: [Node, Node][] = [];
        const concrete = this.paragraphs.map((p) =>
            p.concretize(locales, inputs, replacements),
        );

        let newSpaces = this.spaces;
        for (const [original, replacement] of replacements)
            newSpaces = newSpaces?.withReplacement(original, replacement);

        // Remap the first token of all replaced nodes with the first token of the replacement.
        return concrete.some((p) => p === undefined)
            ? undefined
            : new Markup(concrete as Paragraph[], newSpaces);
    }

    /**
     * Returns the text of every Words token in this markup, in document order.
     * Used to build the searchable text index for concept documentation.
     */
    getWordsTexts(): string[] {
        return this.paragraphs
            .map((p) => p.nodes())
            .flat()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            )
            .map((w) => w.getText());
    }

    asFirstParagraph() {
        return new Markup(this.paragraphs.slice(0, 1), this.spaces);
    }

    /**
     * Returns the smallest leading fragment of this markup — the first sentence
     * of the first paragraph (or first bullet, if bulleted) — as a plain-text
     * Markup, suitable for a short description hint. Returns undefined if there's
     * no text.
     */
    getFirstSentence(locales: Locales): Markup | undefined {
        const first = this.paragraphs[0];
        if (first === undefined) return undefined;

        // Don't run a sentence across bullets: use the first bullet if bulleted.
        const paragraph = first.isBulleted() ? first.getBullets()[0] : first;
        if (paragraph === undefined) return undefined;

        // AST-derived prose: only the Words content tokens (so markup delimiters
        // are excluded — the segmenter is not markup-aware), but with their
        // original inter-token spacing restored from this markup's spaces. Plain
        // toText() drops that spacing, which would run sentences together
        // ("One.Two.Three") and defeat sentence segmentation. Any leading bullet
        // symbol is removed.
        let prose = this.getParagraphProse(paragraph);
        if (prose.startsWith(BULLET_SYMBOL))
            prose = prose.slice(BULLET_SYMBOL.length).trim();
        if (prose.length === 0) return undefined;

        // Locale-aware ICU sentence segmentation on plain prose only.
        const segmenter = new Intl.Segmenter(locales.getLocaleString(), {
            granularity: 'sentence',
        });
        const text = (
            segmenter.segment(prose)[Symbol.iterator]().next().value?.segment ??
            prose
        ).trim();
        if (text.length === 0) return undefined;

        // Re-wrap the plain prose as Markup so it carries the Spaces the renderer
        // needs. The prose is already de-marked-up, so this is effectively a
        // single plain paragraph.
        return Markup.words(text);
    }

    /**
     * Reconstructs a paragraph's plain prose: the text of its Words tokens, in
     * order, separated by a single space wherever the original markup had any
     * whitespace between them. Whitespace lives in this markup's spaces rather
     * than the token text, so plain toText() would run the words together.
     */
    private getParagraphProse(paragraph: Paragraph): string {
        const words = paragraph
            .nodes()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            );
        let prose = '';
        for (const word of words) {
            const space = this.spaces ? this.spaces.getSpace(word) : ' ';
            if (prose.length > 0 && space.length > 0) prose += ' ';
            prose += word.getText();
        }
        return prose.trim();
    }

    toText() {
        let text = this.paragraphs.map((p) => p.toText()).join('\n\n');

        if (this.metadata?.machineTranslated)
            return `${text} ${MACHINE_TRANSLATED_SYMBOL}`;
        else return text;
    }

    /** Returns a sequence of text with formats applied, and null representing paragraph breaks. */
    getFormats() {
        // Enumerate all of the word tokens and identify the Words formats that contain them, generating a list of formatted text.
        const formats: FormattedText[] = [];
        const words: Words[] = [];
        for (const node of this.traverseTopDownWithEnterAndExit()) {
            const italic = words.some((word) => word.getFormat() === 'italic');
            const weight =
                words
                    .map((word) => word.getWeight())
                    .filter((word): word is FontWeight => word !== undefined)
                    .at(-1) ?? 400;
            if (node instanceof Words) {
                if (words[0] === node) words.shift();
                else words.unshift(node);
            } else if (node instanceof Token) {
                if (node.isSymbol(Sym.Words)) {
                    formats.push({ text: node.getText(), italic, weight });
                } else if (node.isSymbol(Sym.Concept)) {
                    const match = ConceptLink.parse(node.getText().slice(1));
                    if (match instanceof CodepointName)
                        formats.push({
                            text:
                                getCodepointFromString(
                                    node.getText().slice(1),
                                ) ?? node.getText(),
                            italic,
                            weight,
                        });
                    else if (match instanceof CharacterName)
                        formats.push({ text: node.getText(), italic, weight });
                }
            }
        }
        return formats;
    }

    asLine() {
        return new Markup(
            [new Paragraph(this.paragraphs.map((p) => p.segments).flat())],
            this.spaces,
        );
    }

    getRepresentativeText() {
        return this.nodes()
            .filter(
                (n): n is Token => n instanceof Token && n.isSymbol(Sym.Words),
            )[0]
            ?.getText();
    }

    append(markups: (Markup | Token)[]): Markup {
        let segments: Segment[] = [];
        const tokens: Token[] = [];
        let spaces: Spaces | undefined = this.spaces;
        for (const markup of [this, ...markups]) {
            if (markup instanceof Markup) {
                const markupSegments = markup.paragraphs
                    .map((p) => p.segments)
                    .flat();
                segments = [...segments, ...markupSegments];
                if (markup.spaces) {
                    spaces = spaces
                        ? spaces.withSpaces(markup.spaces)
                        : markup.spaces
                          ? markup.spaces
                          : undefined;
                }
            } else if (markup instanceof Token) {
                segments.push(markup);
                tokens.push(markup);
            }
        }

        return new Markup([new Paragraph(segments)], spaces);
    }

    /** Concatenate two markups, preserving paragraph structure. The seam — this
     *  markup's last paragraph and the other's first — is merged into one, so
     *  joining two single-paragraph markups stays single-paragraph, while any
     *  internal paragraph breaks on either side are kept. Unlike `append`, which
     *  flattens everything into one paragraph. */
    concat(other: Markup): Markup {
        const spaces = this.spaces
            ? other.spaces
                ? this.spaces.withSpaces(other.spaces)
                : this.spaces
            : other.spaces;
        if (this.paragraphs.length === 0)
            return new Markup(other.paragraphs, spaces);
        if (other.paragraphs.length === 0)
            return new Markup(this.paragraphs, spaces);
        const last = this.paragraphs[this.paragraphs.length - 1];
        const first = other.paragraphs[0];
        const merged = new Paragraph([...last.segments, ...first.segments]);
        return new Markup(
            [...this.paragraphs.slice(0, -1), merged, ...other.paragraphs.slice(1)],
            spaces,
        );
    }

    /** The plain text content, with no formatting, paragraph breaks, or
     *  machine-translation marker — for programmatic queries (length/has/…).
     *  Unlike `toText`, which joins paragraphs with blank lines and appends the
     *  machine-translation marker for display. */
    getPlainText(): string {
        return this.paragraphs.map((p) => p.toText()).join('');
    }

    withMetadata(metadata: MarkupMetadata) {
        return new Markup(this.paragraphs, this.spaces, metadata);
    }

    isMachineTranslated() {
        return this.metadata?.machineTranslated ?? false;
    }

    toString() {
        return '';
    }
}
