import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import ConceptLink from './ConceptLink';
import type Example from './Example';
import WebLink from './WebLink';
import type { Grammar, Replacement } from './Node';
import Words from './Words';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';
import Token from './Token';
import type Mention from './Mention';
import NodeRef from '../locale/NodeRef';
import ValueRef from '../locale/ValueRef';
import type Branch from './Branch';
import { unescapeDocSymbols } from '../parser/Tokenizer';
import Node, { list, node } from '@nodes/Node';

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

    getGrammar(): Grammar {
        return [
            {
                name: 'segments',
                kind: list(node(Words), node(WebLink), node(ConceptLink)),
            },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Paragraph(
            this.replaceChild('segments', this.getNodeSegments(), replace)
        ) as this;
    }

    getNodeSegments() {
        return this.segments.filter((s) => s instanceof Node) as NodeSegment[];
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Paragraph;
    }

    getGlyphs() {
        return Glyphs.Paragraph;
    }

    concretize(locale: Locale, inputs: TemplateInput[]): Paragraph | undefined {
        const concreteSegments = this.segments.map((content) =>
            content instanceof ValueRef || content instanceof NodeRef
                ? content
                : content instanceof Token // Replace all repeated special characters with single special characters.
                ? content.withText(unescapeDocSymbols(content.getText()))
                : content.concretize(locale, inputs)
        );
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

    withoutBullet() {
        return new Paragraph(
            this.segments.map((s) =>
                s instanceof Words
                    ? s.withoutBullet()
                    : s instanceof Token && s.getText().startsWith('•')
                    ? s.withText(s.getText().replace('•', '').trim())
                    : s
            )
        );
    }

    toText() {
        return this.segments.map((s) => s.toText()).join('');
    }
}
