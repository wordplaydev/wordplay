import type Conflict from '@conflicts/Conflict';
import type Locale from '@locale/Locale';
import Purpose from '../concepts/Purpose';
import Glyphs from '../lore/Glyphs';
import { node, type Grammar, type Replacement, any, none } from './Node';
import Token from './Token';
import Symbol from './Symbol';
import { unescaped } from './TextLiteral';
import Example from './Example';
import WebLink from './WebLink';
import ConceptLink from './ConceptLink';
import Content from './Content';
import type { TemplateInput } from '../locale/concretize';
import type { NodeSegment, Segment } from './Paragraph';
import NodeRef from '../locale/NodeRef';
import ValueRef from '../locale/ValueRef';
import { unescapeDocSymbols } from '../parser/Tokenizer';

export type Format = 'italic' | 'underline' | 'light' | 'bold' | 'extra';

export default class Words extends Content {
    readonly open: Token | undefined;
    readonly segments: Segment[];
    readonly close: Token | undefined;

    constructor(
        open: Token | undefined,
        words: Segment[],
        close: Token | undefined
    ) {
        super();

        this.open = open;
        this.segments = words;
        this.close = close;
    }

    static make() {
        return new Words(undefined, [new Token('…', Symbol.Words)], undefined);
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'open',
                kind: any(
                    node(Symbol.Italic),
                    node(Symbol.Underline),
                    node(Symbol.Light),
                    node(Symbol.Bold),
                    node(Symbol.Extra),
                    none('close')
                ),
            },
            {
                name: 'segments',
                kind: any(
                    node(Words),
                    node(WebLink),
                    node(ConceptLink),
                    node(Example)
                ),
            },
            {
                name: 'close',
                kind: any(
                    node(Symbol.Italic),
                    node(Symbol.Underline),
                    node(Symbol.Light),
                    node(Symbol.Bold),
                    node(Symbol.Extra),
                    none('open')
                ),
            },
        ];
    }

    computeConflicts(): void | Conflict[] {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new Words(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('segments', this.getNodeSegments(), replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getNodeSegments() {
        return this.segments.filter(
            (s) => s instanceof Content || s instanceof Token
        ) as NodeSegment[];
    }

    getPurpose() {
        return Purpose.Document;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.Words;
    }

    getFormat(): Format | undefined {
        return this.open === undefined
            ? undefined
            : this.open.isSymbol(Symbol.Italic)
            ? 'italic'
            : this.open.isSymbol(Symbol.Underline)
            ? 'underline'
            : this.open.isSymbol(Symbol.Light)
            ? 'light'
            : this.open.isSymbol(Symbol.Bold)
            ? 'bold'
            : 'extra';
    }

    containsText(text: string): boolean {
        return this.segments.some(
            (segment) => segment instanceof Words && segment.containsText(text)
        );
    }

    getGlyphs() {
        return Glyphs.Words;
    }

    concretize(locale: Locale, inputs: TemplateInput[]): Words | undefined {
        const concrete = this.segments.map((content) =>
            content instanceof ValueRef || content instanceof NodeRef
                ? content
                : content instanceof Token // Replace all repeated special characters with single special characters.
                ? content.withText(unescapeDocSymbols(content.getText()))
                : content.concretize(locale, inputs)
        );
        return concrete.some((s) => s === undefined)
            ? undefined
            : new Words(this.open, concrete as Segment[], this.close);
    }

    toText(): string {
        return unescaped(
            this.segments.map((segment) => segment.toText()).join('')
        );
    }
}
