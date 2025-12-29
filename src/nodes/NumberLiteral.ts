import Purpose from '@concepts/Purpose';
import type Conflict from '@conflicts/Conflict';
import { NotANumber } from '@conflicts/NotANumber';
import { getPossibleDimensions } from '@edit/menu/getPossibleUnits';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
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
import Dimension from './Dimension';
import Literal from './Literal';
import type Node from './Node';
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

    /** Given a type and source context,  */
    static getPossibleNumbers(
        node: Node | undefined,
        type: Type | undefined,
        context: Context,
    ) {
        // What number types are possible?
        const possibleNumberTypes = type
            ?.getPossibleTypes(context)
            .filter(
                (possibleType): possibleType is NumberType =>
                    possibleType instanceof NumberType,
            );

        // If a type is provided, and it has a unit, suggest numbers with corresponding units.
        if (possibleNumberTypes && possibleNumberTypes.length > 0) {
            return possibleNumberTypes.map((numberType) => {
                const unit =
                    numberType.unit instanceof Unit
                        ? numberType.unit.clone()
                        : undefined;
                return numberType.isLiteral()
                    ? numberType.getLiteral()
                    : node instanceof NumberLiteral
                      ? node.withUnit(unit)
                      : NumberLiteral.make(1, unit);
            });
        }
        // No type provided, but there's a node? Suggest numbers with all possible units.
        else if (node instanceof NumberLiteral) {
            return getPossibleDimensions(context).map((dimension) =>
                NumberLiteral.make(
                    node.number.getText(),
                    new Unit(undefined, [Dimension.make(false, dimension, 1)]),
                ),
            );
        }
        // No type? Suggest some common numbers and hard to type numbers.
        else
            return [
                NumberLiteral.make(0, undefined, Sym.Decimal),
                NumberLiteral.make('π', undefined, Sym.Pi),
                NumberLiteral.make('∞', undefined, Sym.Infinity),
            ];
    }

    /** Replacing a node with another? Get numbers that match the expected type. */
    static getPossibleReplacements({
        node,
        type,
        complete,
        context,
    }: ReplaceContext) {
        return !complete || node instanceof NumberLiteral
            ? NumberLiteral.getPossibleNumbers(node, type, context)
            : [];
    }

    /** Inserting a number in a list? Get numbers that match the expected type. */
    static getPossibleInsertions({ type, context }: InsertContext) {
        return NumberLiteral.getPossibleNumbers(undefined, type, context);
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

    withUnit(unit: Unit | undefined) {
        return new NumberLiteral(this.number.clone(), unit);
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
