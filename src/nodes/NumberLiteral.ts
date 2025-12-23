import Purpose from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import { NotANumber } from '@conflicts/NotANumber';
import type { ReplaceContext } from '@edit/EditContext';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import NumberValue from '@values/NumberValue';
import type Decimal from 'decimal.js';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Locales from '../locale/Locales';
import { type TemplateInput } from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import type Context from './Context';
import Literal from './Literal';
import { node, optional, type Grammar, type Replacement } from './Node';
import NumberType from './NumberType';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import Unit from './Unit';

export default class NumberLiteral extends Literal {
    readonly number: Token;
    readonly unit: Unit | undefined;

    #numberCache: Decimal | undefined;
    #precisionCache: number | undefined;

    constructor(number: Token, unit?: Unit) {
        super();

        this.number = number;
        this.unit = unit;

        this.computeChildren();
    }

    static make(number?: number | string, unit?: Unit, type?: Sym) {
        return new NumberLiteral(
            new Token(
                number === undefined
                    ? 'NaN'
                    : typeof number === 'number'
                      ? '' + number
                      : number,
                [Sym.Number, ...(type ? [type] : [])],
            ),
            unit === undefined ? Unit.Empty : unit,
        );
    }

    static getPossibleReplacements({ type, context }: ReplaceContext) {
        const possibleNumberTypes = type
            ?.getPossibleTypes(context)
            .filter(
                (possibleType): possibleType is NumberType =>
                    possibleType instanceof NumberType,
            );

        // If a type is provided, and it has a unit, suggest numbers with corresponding units.
        if (possibleNumberTypes && possibleNumberTypes.length > 0) {
            return possibleNumberTypes.map((numberType) =>
                numberType.isLiteral()
                    ? numberType.getLiteral()
                    : NumberLiteral.make(
                          1,
                          numberType.unit instanceof Unit
                              ? numberType.unit.clone()
                              : undefined,
                      ),
            );
        }
    }

    static getPossibleAppends() {
        return [
            NumberLiteral.make(0, undefined, Sym.Decimal),
            NumberLiteral.make('π', undefined, Sym.Pi),
            NumberLiteral.make('∞', undefined, Sym.Infinity),
        ];
    }

    getDescriptor(): NodeDescriptor {
        return 'NumberLiteral';
    }

    getPurpose(): Purpose {
        return Purpose.Numbers;
    }

    isPercent() {
        return this.number.getText().endsWith('%');
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'number',
                kind: node(Sym.Number),
                uncompletable: true,
                label: undefined,
            },
            {
                name: 'unit',
                kind: optional(node(Unit)),
                label: () => (l) => l.term.unit,
            },
        ];
    }

    clone(replace?: Replacement) {
        return new NumberLiteral(
            this.replaceChild('number', this.number, replace),
            this.replaceChild('unit', this.unit, replace),
        ) as this;
    }

    getAffiliatedType(): BasisTypeName | undefined {
        return 'measurement';
    }

    isInteger() {
        return !isNaN(parseInt(this.number.text.toString()));
    }

    computeConflicts(): Conflict[] {
        if (this.getValue().num.isNaN()) return [new NotANumber(this)];
        else return [];
    }

    computeType(): Type {
        return new NumberType(this.number, this.unit);
    }

    getValue() {
        if (this.#numberCache)
            return new NumberValue(
                this,
                this.#numberCache,
                this.unit,
                this.#precisionCache,
            );
        else {
            const value = new NumberValue(this, this.number, this.unit);
            this.#numberCache = value.num;
            this.#precisionCache = value.precision;
            return value;
        }
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.number;
    }
    getFinish() {
        return this.number;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.NumberLiteral;
    getLocalePath() {
        return NumberLiteral.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.NumberLiteral.start,
            new NodeRef(this.number, locales, context),
        );
    }

    getCharacter() {
        return Characters.Number;
    }

    getDescriptionInputs(locales: Locales, context: Context): TemplateInput[] {
        return [
            this.number.getText(),
            this.unit ? new NodeRef(this.unit, locales, context) : undefined,
        ];
    }

    adjust(direction: -1 | 1): this | undefined {
        const value = this.getValue().num;

        const isPercent = this.isPercent();
        const amount = this.isPercent() ? 0.01 : 1;

        return value
            ? (NumberLiteral.make(
                  value
                      .plus(direction * amount)
                      .times(isPercent ? 100 : 1)
                      .toString() + (isPercent ? '%' : ''),
                  this.unit,
              ) as this)
            : undefined;
    }
}
