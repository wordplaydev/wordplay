import NumberValue from '@values/NumberValue';
import type Conflict from '@conflicts/Conflict';
import NumberType from './NumberType';
import Token from './Token';
import type Type from './Type';
import Unit from './Unit';
import { NotANumber } from '@conflicts/NotANumber';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import Sym from './Sym';
import Node, { node, type Grammar, type Replacement, optional } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Decimal from 'decimal.js';
import concretize, { type TemplateInput } from '../locale/concretize';

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
                [Sym.Number, ...(type ? [type] : [])]
            ),
            unit === undefined ? Unit.Empty : unit
        );
    }

    static getPossibleNodes(
        type: Type | undefined,
        _: Node,
        __: boolean,
        context: Context
    ) {
        const possibleNumberTypes = type
            ?.getPossibleTypes(context)
            .filter(
                (possibleType): possibleType is NumberType =>
                    possibleType instanceof NumberType
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
                              : undefined
                      )
            );
        } else {
            return [
                NumberLiteral.make(0, undefined, Sym.Decimal),
                NumberLiteral.make('π', undefined, Sym.Pi),
                NumberLiteral.make('∞', undefined, Sym.Infinity),
            ];
        }
    }

    isPercent() {
        return this.number.getText().endsWith('%');
    }

    getGrammar(): Grammar {
        return [
            { name: 'number', kind: node(Sym.Number), uncompletable: true },
            { name: 'unit', kind: optional(node(Unit)) },
        ];
    }

    clone(replace?: Replacement) {
        return new NumberLiteral(
            this.replaceChild('number', this.number, replace),
            this.replaceChild('unit', this.unit, replace)
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
                this.#precisionCache
            );
        else {
            const value = new NumberValue(this, this.number, this.unit);
            this.#numberCache = value.num;
            this.#precisionCache = value.precision;
            return value;
        }
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getStart() {
        return this.number;
    }
    getFinish() {
        return this.number;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.NumberLiteral;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.NumberLiteral.start,
            new NodeRef(this.number, locale, context)
        );
    }

    getGlyphs() {
        return Glyphs.Number;
    }

    getDescriptionInputs(locale: Locale, context: Context): TemplateInput[] {
        return [
            this.number.getText(),
            this.unit ? new NodeRef(this.unit, locale, context) : undefined,
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
                  this.unit
              ) as this)
            : undefined;
    }
}
