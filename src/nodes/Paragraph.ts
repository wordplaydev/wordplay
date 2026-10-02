import type Conflict from '#conflicts/Conflict.ts';
import TermRef from '#locale/TermRef.ts';
import ConceptRef from '#locale/ConceptRef.ts';
import { allDefined } from '#util/nullable.ts';
import type {
    InsertContext,
    ReplaceContext,
} from '#edit/revision/EditContext.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import Node, { list, node } from '#nodes/Node.ts';
import { Purpose } from '#concepts/Purpose.ts';
import type Locales from '#locale/Locales.ts';
import type { TemplateInput } from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import previewText from '#locale/previewText.ts';
import ValueRef from '#locale/ValueRef.ts';
import Characters from '../lore/BasisCharacters';
import { unescapeMarkupSymbols } from '#parser/Tokenizer.ts';
import { BULLET_SYMBOL } from '#parser/Symbols.ts';
import Branch from '#nodes/Branch.ts';
import ConceptLink from '#nodes/ConceptLink.ts';
import Content from '#nodes/Content.ts';
import Example from '#nodes/Example.ts';
import ExternalExample from '#nodes/ExternalExample.ts';
import Mention from '#nodes/Mention.ts';
import type { Grammar, Replacement } from '#nodes/Node.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';
import WebLink from '#nodes/WebLink.ts';
import Words, { type Format } from '#nodes/Words.ts';

export type NodeSegment =
    | Token
    | Words
    | WebLink
    | ConceptLink
    | Example
    | ExternalExample
    | Mention
    | Branch;

/** A paragraph's parts: nodes as parsed, plus the references that
 *  concretizing a template puts in their place (a value, a node, a concept,
 *  a glossary term), which the markup views render alongside them. */
export type Segment = NodeSegment | ValueRef | NodeRef | ConceptRef | TermRef;

export default class Paragraph extends Content {
    readonly segments: Segment[];

    constructor(segments: Segment[]) {
        super();

        this.segments = segments;
    }

    static getPossibleReplacements({ locales }: ReplaceContext) {
        return [
            new Paragraph([
                Words.make(locales.getMultilingualText((l) => l.token.Words)),
            ]),
        ];
    }

    static getPossibleInsertions({ locales }: InsertContext) {
        return [
            new Paragraph([
                Words.make(locales.getMultilingualText((l) => l.token.Words)),
            ]),
        ];
    }

    getDescriptor(): NodeDescriptor {
        return 'Paragraph';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'segments',
                kind: list(
                    true,
                    node(Sym.Words),
                    node(Sym.URL),
                    node(Words),
                    node(WebLink),
                    node(ConceptLink),
                    node(Example),
                    node(ExternalExample),
                    node(Branch),
                    node(Mention),
                ),
                label: () => (l) => l.glossary.markup.word,
            },
        ];
    }

    computeConflicts(): Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return this.cloned(
            new Paragraph(
                this.replaceChild('segments', this.getNodeSegments(), replace),
            ),
        );
    }

    getNodeSegments() {
        return this.segments.filter((s): s is NodeSegment => s instanceof Node);
    }

    withSegments(segments: Segment[]) {
        return new Paragraph(segments);
    }

    withSegmentInsertedAt(index: number, segment: Segment) {
        const newSegments = [...this.segments];
        newSegments.splice(index, 0, segment);
        return this.withSegments(newSegments);
    }

    getPurpose() {
        return Purpose.Documentation;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Paragraph;

    getLocalePath() {
        return Paragraph.LocalePath;
    }

    getCharacter() {
        return Characters.Paragraph;
    }

    getDescriptionInputs(): Record<string, TemplateInput> {
        // Always a string, never undefined: an empty one renders as nothing,
        // while undefined would render the whole template as unparsable. That
        // keeps the template branch-free, which is what machine translation
        // most often mangles.
        return { text: previewText(this.toText()) };
    }

    concretize(
        locales: Locales,
        inputs: Record<string, TemplateInput>,
        replacements: [Node, Node][],
    ): Paragraph | undefined {
        const concreteSegments = this.segments.map((content) => {
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
                    unescapeMarkupSymbols(content.getText()),
                );
                if (replacement.getText() !== content.getText()) {
                    replacements.push([content, replacement]);
                    return replacement;
                } else return content;
            } else return content.concretize(locales, inputs, replacements);
        });
        return allDefined(concreteSegments)
            ? new Paragraph(concreteSegments)
            : undefined;
    }

    isBulleted() {
        return (
            (this.segments[0] instanceof Words &&
                this.segments[0].isBulleted()) ||
            (this.segments[0] instanceof Token &&
                this.segments[0].getText().startsWith(BULLET_SYMBOL))
        );
    }

    getBullets(): Paragraph[] {
        if (this.isBulleted()) {
            const bullets: Paragraph[] = [];
            const remaining = this.segments.slice();
            let current: Segment[] = [];
            while (remaining.length > 0) {
                const segment = remaining.shift();
                if (segment === undefined) break;
                if (
                    (segment instanceof Words && segment.isBulleted()) ||
                    (segment instanceof Token &&
                        segment.getText().startsWith(BULLET_SYMBOL))
                ) {
                    if (current.length > 0)
                        bullets.push(new Paragraph(current));
                    current = [segment];
                } else current.push(segment);
            }
            if (current.length > 0) bullets.push(new Paragraph(current));

            return bullets;
        }
        return [];
    }

    /** Finds all of the Words that wrap all of the content of this paragraph and gets all of their formats. */
    getFormats(): Format[] {
        return this.segments.length === 1 && this.segments[0] instanceof Words
            ? this.segments[0].getFormats()
            : [];
    }

    toText() {
        return this.segments.map((s) => s.toText()).join('');
    }
}
