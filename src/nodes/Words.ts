import type Conflict from '#conflicts/Conflict.ts';
import TermRef from '#locale/TermRef.ts';
import ConceptRef from '#locale/ConceptRef.ts';
import { allDefined } from '#util/nullable.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import type { FontWeight } from '#basis/faces/Fonts.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import previewText from '#locale/previewText.ts';
import ValueRef from '#locale/ValueRef.ts';
import Characters from '../lore/BasisCharacters';
import { unescapeMarkupSymbols } from '#parser/Tokenizer.ts';
import {
    BOLD_SYMBOL,
    BULLET_SYMBOL,
    EXTRA_SYMBOL,
    ITALIC_SYMBOL,
    LIGHT_SYMBOL,
    UNDERSCORE_SYMBOL,
} from '#parser/Symbols.ts';
import type { InsertContext } from '#edit/revision/EditContext.ts';
import { withColorEmoji } from '#unicode/emoji.ts';
import Branch from '#nodes/Branch.ts';
import ConceptLink from '#nodes/ConceptLink.ts';
import Content from '#nodes/Content.ts';
import Example from '#nodes/Example.ts';
import Mention from '#nodes/Mention.ts';
import Node, {
    any,
    list,
    node,
    none,
    type Grammar,
    type Replacement,
} from '#nodes/Node.ts';
import type { NodeSegment, Segment } from '#nodes/Paragraph.ts';
import { Sym } from '#nodes/Sym.ts';
import { resolveCodepoints } from '#nodes/TextLiteral.ts';
import Token from '#nodes/Token.ts';
import WebLink from '#nodes/WebLink.ts';

export type Format = 'italic' | 'underline' | 'light' | 'bold' | 'extra';

export default class Words extends Content {
    readonly open: Token | undefined;
    readonly segments: Segment[];
    readonly close: Token | undefined;

    constructor(
        open: Token | undefined,
        words: Segment[],
        close: Token | undefined,
    ) {
        super();

        this.open = open;
        this.segments = words;
        this.close = close;
    }

    static make(text?: string) {
        return new Words(
            undefined,
            [new Token(text ?? '…', Sym.Words)],
            undefined,
        );
    }

    /** Make a formatted run of words, e.g. italic or bold. */
    static makeFormatted(format: Format, text?: string) {
        const symbol =
            format === 'italic'
                ? new Token(ITALIC_SYMBOL, Sym.Italic)
                : format === 'underline'
                  ? new Token(UNDERSCORE_SYMBOL, Sym.Underline)
                  : format === 'light'
                    ? new Token(LIGHT_SYMBOL, Sym.Light)
                    : format === 'bold'
                      ? new Token(BOLD_SYMBOL, Sym.Bold)
                      : new Token(EXTRA_SYMBOL, Sym.Extra);
        return new Words(
            symbol,
            [new Token(text ?? '…', Sym.Words)],
            symbol.clone(),
        );
    }

    /** Bare words are typed, not chosen from a menu; a run is only offered as an insertion. */
    static getPossibleReplacements() {
        return [];
    }

    /** Offer formatted runs (italic, bold) wherever markup content lives, so formatting is
     * creatable without typing the delimiters. */
    static getPossibleInsertions({ parent, field }: InsertContext) {
        const kind = parent.getGrammar().find((f) => f.name === field)?.kind;
        return kind !== undefined && kind.allowsKind(Words)
            ? [Words.makeFormatted('italic'), Words.makeFormatted('bold')]
            : [];
    }

    getDescriptor(): NodeDescriptor {
        return 'Words';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'open',
                kind: any(
                    node(Sym.Italic),
                    node(Sym.Underline),
                    node(Sym.Light),
                    node(Sym.Bold),
                    node(Sym.Extra),
                    none(['close', (close) => close.clone()]),
                ),
                label: undefined,
            },
            {
                name: 'segments',
                kind: list(
                    true,
                    node(Words),
                    node(WebLink),
                    node(ConceptLink),
                    node(Example),
                    node(Sym.Words),
                    node(Sym.URL),
                    node(Mention),
                    node(Branch),
                ),
                label: () => (l) => l.glossary.markup.word,
            },
            {
                name: 'close',
                kind: any(
                    node(Sym.Italic),
                    node(Sym.Underline),
                    node(Sym.Light),
                    node(Sym.Bold),
                    node(Sym.Extra),
                    none(['open', (open) => open.clone()]),
                ),
                label: undefined,
            },
        ];
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return this.cloned(
            new Words(
                this.replaceChild('open', this.open, replace),
                this.replaceChild(
                    'segments',
                    // We have to branch here because otherwise, we don't pass the original list to replaceChild(), which
                    // breaks replacements that target the list.
                    this.segments.every((n) => n instanceof Node)
                        ? this.segments
                        : this.getNodeSegments(),
                    replace,
                ),
                this.replaceChild('close', this.close, replace),
            ),
        );
    }

    getNodeSegments() {
        return this.segments.filter((s): s is NodeSegment => s instanceof Node);
    }

    withSegments(segments: Segment[]) {
        return new Words(this.open, segments, this.close);
    }

    withSegmentInsertedAt(index: number, segment: Segment) {
        const newSegments = [...this.segments];
        newSegments.splice(index, 0, segment);
        return this.withSegments(newSegments);
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Words;
    getLocalePath() {
        return Words.LocalePath;
    }

    getFormat(): Format | undefined {
        return this.open === undefined
            ? undefined
            : this.open.isSymbol(Sym.Italic)
              ? 'italic'
              : this.open.isSymbol(Sym.Underline)
                ? 'underline'
                : this.open.isSymbol(Sym.Light)
                  ? 'light'
                  : this.open.isSymbol(Sym.Bold)
                    ? 'bold'
                    : 'extra';
    }

    /** Gets this format and all of the nested formats of segments that wrap the entire Word. */
    getFormats(): Format[] {
        const format = this.getFormat();
        if (format === undefined) return [];
        else if (this.segments.length === 1) {
            return this.segments[0] instanceof Token ||
                !(this.segments[0] instanceof Words)
                ? [format]
                : [format, ...this.segments[0].getFormats()];
        } else return [format];
    }

    getWeight(): FontWeight | undefined {
        return this.open
            ? this.open.isSymbol(Sym.Light)
                ? 300
                : this.open.isSymbol(Sym.Bold)
                  ? 700
                  : this.open.isSymbol(Sym.Extra)
                    ? 900
                    : 400
            : undefined;
    }

    containsText(text: string): boolean {
        return this.segments.some(
            (segment) => segment instanceof Words && segment.containsText(text),
        );
    }

    getCharacter() {
        return Characters.Words;
    }

    getDescriptionInputs(): Record<string, TemplateInput> {
        // Always a string; see Paragraph.getDescriptionInputs.
        return { text: previewText(this.toText()) };
    }

    concretize(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
        replacements: [Node, Node][],
    ): Words | undefined {
        const concrete = this.segments.map((content) => {
            if (
                content instanceof ValueRef ||
                content instanceof NodeRef ||
                content instanceof ConceptRef ||
                content instanceof TermRef
            )
                return content;
            // Replace all repeated special characters with single special characters.
            // URLs are left verbatim; unescaping would collapse the // in https://.
            else if (content instanceof Token) {
                if (content.isSymbol(Sym.URL)) return content;
                const replacement = content.withText(
                    withColorEmoji(unescapeMarkupSymbols(content.getText())),
                );
                if (replacement.getText() !== content.getText()) {
                    replacements.push([content, replacement]);
                    return replacement;
                } else return content;
            } else return content.concretize(locales, inputs, replacements);
        });
        return allDefined(concrete)
            ? new Words(this.open, concrete, this.close)
            : undefined;
    }

    isBulleted() {
        return (
            this.segments[0] instanceof Token &&
            this.segments[0].getText().startsWith(BULLET_SYMBOL)
        );
    }

    toText(): string {
        // Markup escapes any markup symbol by doubling it (`**`→`*`, `@@`→`@`,
        // `\\`→`\`), matching what `concretize` does for rendering, then resolves
        // `@<codepoint>` escapes. (Previously this used the text-literal scheme,
        // so doubled markup symbols survived into the converted text.)
        return resolveCodepoints(
            this.segments
                .map((segment) =>
                    // URLs are left verbatim; unescaping would collapse the // in https://.
                    segment instanceof Token && segment.isSymbol(Sym.URL)
                        ? segment.toText()
                        : unescapeMarkupSymbols(segment.toText()),
                )
                .join(''),
        );
    }
}
