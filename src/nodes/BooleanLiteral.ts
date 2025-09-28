import type EditContext from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { FALSE_SYMBOL, TRUE_SYMBOL } from '@parser/Symbols';
import BoolValue from '@values/BoolValue';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import BooleanType from './BooleanType';
import type Context from './Context';
import Literal from './Literal';
import { node, type Grammar, type Replacement } from './Node';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';

export default class BooleanLiteral extends Literal {
    readonly value: Token;

    constructor(value: Token) {
        super();

        this.value = value;

        this.computeChildren();
    }

    static make(value: boolean) {
        return new BooleanLiteral(
            new Token(value === true ? TRUE_SYMBOL : FALSE_SYMBOL, Sym.Boolean),
        );
    }

    static getPossibleReplacements({ type }: EditContext) {
        // Any type or a boolean? Offer the literals
        return type === undefined || type instanceof BooleanType
            ? [BooleanLiteral.make(true), BooleanLiteral.make(false)]
            : [];
    }

    static getPossibleAppends() {
        return BooleanLiteral.make(true);
    }

    getDescriptor(): NodeDescriptor {
        return 'BooleanLiteral';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'value',
                kind: node(Sym.Boolean),
                getType: () => BooleanType.make(),
                label: undefined,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new BooleanLiteral(
            this.replaceChild('value', this.value, replace),
        ) as this;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'boolean';
    }

    computeConflicts() {
        return [];
    }

    computeType(): Type {
        return BooleanType.make();
    }

    getValue() {
        return new BoolValue(this, this.bool());
    }

    bool(): boolean {
        return this.value.text.toString() === TRUE_SYMBOL;
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.value;
    }
    getFinish() {
        return this.value;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.BooleanLiteral;
    getLocalePath() {
        return BooleanLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.BooleanLiteral.start,
            new NodeRef(this.value, locales, context, this.value.getText()),
        );
    }

    getDescriptionInputs() {
        return [this.bool()];
    }

    getCharacter() {
        return Characters.BooleanLiteral;
    }

    adjust(): this | undefined {
        return BooleanLiteral.make(!this.bool()) as this;
    }
}
