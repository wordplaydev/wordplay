import Measurement from '@runtime/Measurement';
import type Conflict from '@conflicts/Conflict';
import MeasurementType from './MeasurementType';
import Token from './Token';
import type Type from './Type';
import Unit from './Unit';
import { NotANumber } from '@conflicts/NotANumber';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import PlaceholderToken from './PlaceholderToken';
import TokenType from './TokenType';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Literal from './Literal';
import Glyphs from '../lore/Glyphs';
import type { NativeTypeName } from '../native/NativeConstants';
import type Decimal from 'decimal.js';
import concretize, { type TemplateInput } from '../locale/concretize';

export default class MeasurementLiteral extends Literal {
    readonly number: Token;
    readonly unit: Unit;

    #cache: Decimal | undefined;

    constructor(number: Token, unit: Unit) {
        super();

        this.number = number;
        this.unit = unit;

        this.computeChildren();
    }

    static make(number?: number | string, unit?: Unit) {
        return new MeasurementLiteral(
            number === undefined
                ? new PlaceholderToken()
                : new Token(
                      typeof number === 'number' ? '' + number : number,
                      TokenType.Decimal
                  ),
            unit === undefined ? Unit.Empty : unit
        );
    }

    getGrammar() {
        return [
            { name: 'number', types: [Token] },
            { name: 'unit', types: [Unit] },
        ];
    }

    clone(replace?: Replacement) {
        return new MeasurementLiteral(
            this.replaceChild('number', this.number, replace),
            this.replaceChild('unit', this.unit, replace)
        ) as this;
    }

    getAffiliatedType(): NativeTypeName | undefined {
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
        return new MeasurementType(this.number, this.unit);
    }

    getValue() {
        if (this.#cache) return new Measurement(this, this.#cache, this.unit);
        else {
            const value = new Measurement(this, this.number, this.unit);
            this.#cache = value.num;
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
        return translation.node.MeasurementLiteral;
    }

    getStartExplanations(locale: Locale, context: Context) {
        return concretize(
            locale,
            locale.node.MeasurementLiteral.start,
            new NodeRef(this.number, locale, context)
        );
    }

    getGlyphs() {
        return Glyphs.Measurement;
    }

    getDescriptionInputs(_: Locale, __: Context): TemplateInput[] {
        return [this.number.getText(), this.unit.toWordplay()];
    }
}
