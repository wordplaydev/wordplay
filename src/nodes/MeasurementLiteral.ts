import Measurement from '../runtime/Measurement';
import type Value from '../runtime/Value';
import type Conflict from '../conflicts/Conflict';
import Expression from './Expression';
import MeasurementType from './MeasurementType';
import Token from './Token';
import type Type from './Type';
import type Node from './Node';
import Unit from './Unit';
import type Step from '../runtime/Step';
import { NotANumber } from '../conflicts/NotANumber';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import PlaceholderToken from './PlaceholderToken';
import type Translations from './Translations';
import { TRANSLATE } from './Translations';
import TokenType from './TokenType';
import type Evaluator from '../runtime/Evaluator';
import StartFinish from '../runtime/StartFinish';

export default class MeasurementLiteral extends Expression {
    readonly number: Token;
    readonly unit: Unit;

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
                      TokenType.DECIMAL
                  ),
            unit === undefined ? Unit.Empty : unit
        );
    }

    clone(original?: Node, replacement?: Node) {
        return new MeasurementLiteral(
            this.replaceChild('number', this.number, original, replacement),
            this.replaceChild('unit', this.unit, original, replacement)
        ) as this;
    }

    getGrammar() {
        return [
            { name: 'number', types: [Token] },
            { name: 'unit', types: [Unit] },
        ];
    }

    isInteger() {
        return !isNaN(parseInt(this.number.text.toString()));
    }

    computeConflicts(): Conflict[] {
        if (this.toValue().num.isNaN()) return [new NotANumber(this)];
        else return [];
    }

    computeType(): Type {
        return new MeasurementType(this.number, this.unit);
    }

    getDependencies(): Expression[] {
        return [];
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(_: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return this.toValue();
    }

    toValue() {
        return new Measurement(this, this.number, this.unit);
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

    getChildPlaceholderLabel(child: Node): Translations | undefined {
        if (child === this.number)
            return {
                '😀': TRANSLATE,
                eng: '#',
            };
    }

    getDescriptions(): Translations {
        return {
            '😀': TRANSLATE,
            eng: this.number.is(TokenType.PI)
                ? 'pi'
                : this.number.is(TokenType.INFINITY)
                ? 'infinity'
                : this.unit.isUnitless()
                ? 'a number'
                : 'a number with a unit',
        };
    }

    getStart() {
        return this.number;
    }
    getFinish() {
        return this.number;
    }

    getStartExplanations(): Translations {
        return {
            '😀': TRANSLATE,
            eng: "Let's make a number!",
        };
    }

    getFinishExplanations(): Translations {
        return {
            '😀': TRANSLATE,
            eng: 'We made a number!',
        };
    }
}
