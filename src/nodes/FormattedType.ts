import type { NodeText, DescriptiveNodeText } from '../locale/NodeTexts';
import type Glyph from '../lore/Glyph';
import type { BasisTypeName } from '../basis/BasisConstants';
import BasisType from './BasisType';
import { node, type Grammar, type Replacement } from './Node';
import type TypeSet from './TypeSet';
import Sym from './Sym';
import Token from './Token';
import Glyphs from '../lore/Glyphs';
import { DOCS_SYMBOL } from '../parser/Symbols';
import type Locales from '../locale/Locales';

export default class FormattedType extends BasisType {
    readonly tick: Token;

    constructor(tick: Token) {
        super();

        this.tick = tick;
    }

    static make() {
        return new FormattedType(new Token(DOCS_SYMBOL, Sym.Doc));
    }

    getDescriptor() {
        return 'FormattedType';
    }

    getGrammar(): Grammar {
        return [{ name: 'tick', kind: node(Sym.Doc) }];
    }

    acceptsAll(types: TypeSet): boolean {
        return types.list().every((type) => type instanceof FormattedType);
    }

    getBasisTypeName(): BasisTypeName {
        return 'formatted';
    }

    computeConflicts() {
        return [];
    }

    clone(replace?: Replacement | undefined): this {
        return new FormattedType(
            this.replaceChild('tick', this.tick, replace)
        ) as this;
    }

    getGlyphs(): Glyph {
        return Glyphs.Formatted;
    }

    getNodeLocale(locales: Locales): NodeText | DescriptiveNodeText {
        return locales.get((l) => l.node.FormattedType);
    }
}
