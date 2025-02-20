import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import type {
    DescriptiveNodeText,
    NodeDescriptor,
    NodeText,
} from '../locale/NodeTexts';
import Characters from '../lore/BasisCharacters';
import { DOCS_SYMBOL } from '../parser/Symbols';
import BasisType from './BasisType';
import FormattedLiteral from './FormattedLiteral';
import FormattedTranslation from './FormattedTranslation';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import type TypeSet from './TypeSet';

export default class FormattedType extends BasisType {
    readonly tick: Token;

    constructor(tick: Token) {
        super();

        this.tick = tick;
    }

    static make() {
        return new FormattedType(new Token(DOCS_SYMBOL, Sym.Doc));
    }

    getDescriptor(): NodeDescriptor {
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
            this.replaceChild('tick', this.tick, replace),
        ) as this;
    }

    getCharacter() {
        return Characters.Formatted;
    }

    getNodeLocale(locales: Locales): NodeText | DescriptiveNodeText {
        return locales.get((l) => l.node.FormattedType);
    }

    getDefaultExpression() {
        return new FormattedLiteral([FormattedTranslation.make()]);
    }
}
