import type Conflict from '@conflicts/Conflict';
import ConceptLink from './ConceptLink';
import Example from './Example';
import WebLink from './WebLink';
import type { Grammar, Replacement } from './Node';
import Words, { type Format } from './Words';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';
import Token from './Token';
import Mention from './Mention';
import NodeRef from '../locale/NodeRef';
import ValueRef from '../locale/ValueRef';
import Branch from './Branch';
import { unescapeMarkupSymbols } from '../parser/Tokenizer';
import Node, { list, node } from '@nodes/Node';
import Sym from './Sym';
import type Locales from '../locale/Locales';

export type NodeSegment =
    | Token
    | Words
    | WebLink
    | ConceptLink
    | Example
    | Mention
    | Branch;

export type Segment = NodeSegment | ValueRef | NodeRef;

export default class Paragraph extends Content {
    readonly segments: Segment[];

    constructor(segments: Segment[]) {
        super();

        this.segments = segments;
    }

    static getPossibleNodes() {
        return [];
    }

    getDescriptor() {
        return 'Paragraph';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'segments',
                kind: list(
                    true,
                    node(Sym.Words),
                    node(Words),
                    node(WebLink),
                    node(ConceptLink),
                    node(Example),
                    node(Branch),
                    node(Mention),
                    node(Branch),
                ),
            },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Paragraph(
            this.replaceChild('segments', this.getNodeSegments(), replace),
        ) as this;
    }

    getNodeSegments() {
        return this.segments.filter((s) => s instanceof Node) as NodeSegment[];
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Paragraph);
    }

    getGlyphs() {
        return Glyphs.Paragraph;
    }

    concretize(
        locales: Locales,
        inputs: TemplateInput[],
        replacements: [Node, Node][],
    ): Paragraph | undefined {
        const concreteSegments = this.segments.map((content) => {
            if (content instanceof ValueRef || content instanceof NodeRef)
                return content;
            // Replace all repeated special characters with single special characters.
            else if (content instanceof Token) {
                const replacement = content.withText(
                    unescapeMarkupSymbols(content.getText()),
                );
                if (replacement.getText() !== content.getText()) {
                    replacements.push([content, replacement]);
                    return replacement;
                } else return content;
            } else return content.concretize(locales, inputs, replacements);
        });
        return concreteSegments.some((s) => s === undefined)
            ? undefined
            : new Paragraph(concreteSegments as Segment[]);
    }

    isBulleted() {
        return (
            (this.segments[0] instanceof Words &&
                this.segments[0].isBulleted()) ||
            (this.segments[0] instanceof Token &&
                this.segments[0].getText().startsWith('•'))
        );
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
