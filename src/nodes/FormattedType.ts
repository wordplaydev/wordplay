import type LocaleText from '@locale/LocaleText';
import type { BasisTypeName } from '../basis/BasisConstants';
import type { NodeDescriptor } from '../locale/NodeTexts';
import Characters from '../lore/BasisCharacters';
import { DOCS_SYMBOL } from '../parser/Symbols';
import BasisType from './BasisType';
import type Expression from './Expression';
import { node, type Grammar, type Replacement } from './Node';
import { Sym } from './Sym';
import Token from './Token';
import type TypeSet from './TypeSet';

/** We created this little factory to avoid a cycle in FormattedType's default expression creation. */
let _defaultFactory: (() => Expression) | undefined;
export function registerFormattedDefaultExpression(factory: () => Expression) {
    _defaultFactory = factory;
}

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
        return [{ name: 'tick', kind: node(Sym.Doc), label: undefined }];
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

    getDefaultExpression() {
        return _defaultFactory?.();
    }

    getCharacter() {
        return Characters.Formatted;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.FormattedType;
    getLocalePath() {
        return FormattedType.LocalePath;
    }
}
