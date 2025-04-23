import type Conflict from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import Node, { list, node } from '@nodes/Node';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';
import type { TemplateInput } from '../locale/Locales';
import NodeRef from '../locale/NodeRef';
import ValueRef from '../locale/ValueRef';
import Characters from '../lore/BasisCharacters';
import { unescapeMarkupSymbols } from '../parser/Tokenizer';
import Branch from './Branch';
import ConceptLink from './ConceptLink';
import Content from './Content';
import Example from './Example';
import Mention from './Mention';
import type { Grammar, Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import WebLink from './WebLink';
import Words, { type Format } from './Words';

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

    static getPossibleReplacements() {
        return [new Paragraph([])];
    }

    static getPossibleAppends() {
        return [new Paragraph([])];
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

    computeConflicts(): Conflict[] {
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

    static readonly LocalePath = (l: LocaleText) => l.node.Paragraph;
    getLocalePath() {
        return Paragraph.LocalePath;
    }

    getCharacter() {
        return Characters.Paragraph;
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
                        segment.getText().startsWith('•'))
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
