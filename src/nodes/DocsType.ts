import type Locale from '../locale/Locale';
import type { NodeText, DescriptiveNodeText } from '../locale/NodeTexts';
import type Glyph from '../lore/Glyph';
import type { BasisTypeName } from '../basis/BasisConstants';
import BasisType from './BasisType';
import { node, type Grammar, type Replacement } from './Node';
import type TypeSet from './TypeSet';
import Symbol from './Symbol';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import { DOCS_SYMBOL } from '../parser/Symbols';

export default class DocsType extends BasisType {
    readonly open: Token;
    readonly close: Token;

    constructor(open: Token, close: Token) {
        super();

        this.open = open;
        this.close = close;
    }

    static make() {
        return new DocsType(
            new Token(DOCS_SYMBOL, Symbol.Doc),
            new Token(DOCS_SYMBOL, Symbol.Doc)
        );
    }

    getGrammar(): Grammar {
        return [
            { name: 'open', kind: node(Symbol.Doc) },
            { name: 'close', kind: node(Symbol.Doc) },
        ];
    }

    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => type instanceof DocsType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'docs';
    }

    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new DocsType(
            this.replaceChild('open', this.open, replace),
            this.replaceChild('close', this.close, replace)
        ) as this;
    }

    getGlyphs(): Glyph {
        return Glyphs.Doc;
    }

    getNodeLocale(locale: Locale): NodeText | DescriptiveNodeText {
        return locale.node.DocsType;
    }
}
