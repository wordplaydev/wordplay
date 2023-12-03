import Token from '@nodes/Token';
import Sym from '@nodes/Sym';
import Unit from '@nodes/Unit';
import BoolValue from '@values/BoolValue';
import NoneValue from '@values/NoneValue';
import Decimal from 'decimal.js';
import SimpleValue from './SimpleValue';
import NumberType from '@nodes/NumberType';
import type Value from '../values/Value';
import type { BasisTypeName } from '../basis/BasisConstants';
import type Expression from '../nodes/Expression';
import type Concretizer from '../nodes/Concretizer';
import type Locales from '../locale/Locales';

export type NumberAndPrecision = [Decimal, number | undefined];

/** A decimal number with a unit. */
export default class NumberValue extends SimpleValue {
    readonly num: Decimal;
    readonly unit: Unit;
    /** If originating from decimal text, the number of significant digits after the decimal point. */
    readonly precision: number | undefined;

    constructor(
        creator: Expression,
        number: number | Token | Decimal | string,
        unit?: Unit,
        precision?: number
    ) {
        super(creator);

        this.unit = unit === undefined ? Unit.Empty : unit;
        // Start by assuming we don't know the precision.
        this.precision = precision;

        // If the number given is a Decimal, just assign it.
        if (number instanceof Decimal) {
            this.num = number;
        }
        // If the number is a token, convert it to a Decimal, and preserve significant digits.
        else if (number instanceof Token) {
            const [num, precision] = NumberValue.fromToken(number);
            this.num = num;
            if (this.precision === undefined) this.precision = precision;
        }
        // If it's a Javascript floating point, convert.
        else if (typeof number === 'number') {
            this.num = new Decimal(number);
        }
        // If it's a string, try to convert it from one of our known formats to decimal.
        else if (typeof number === 'string') {
            const negated = number.charAt(0) === '-';
            if (negated) number = number.substring(1);
            const [num, precision] = NumberValue.fromUnknown(number, negated);
            this.num = num;
            this.precision = precision;
        }
        // Otherwise, we don't know what it is.
        else {
            this.num = new Decimal(NaN);
        }
    }

    static fromToken(number: Token): NumberAndPrecision {
        let text = number.text.toString();

        // All number formats can be negated. Check for it, then remove it.
        const negated = text.charAt(0) === '-';
        if (negated) text = text.substring(1);

        // Infinity
        if (number.isSymbol(Sym.Infinity) || text === '∞') {
            return [new Decimal(Infinity * (negated ? -1 : 1)), undefined];
        }
        // Pi
        else if (number.isSymbol(Sym.Pi) || text === 'π') {
            return [
                new Decimal(Math.PI * (negated ? -1 : 1)),
                Decimal.precision,
            ];
        }
        // If it matches the decimal pattern, randomize requested digits, then convert to a Decimal.
        else if (number.isSymbol(Sym.Decimal)) {
            return convertDecimal(text, negated);
        }
        // If it matches a number with a different base, convert it to a Decimal.
        else if (number.isSymbol(Sym.Base)) {
            return convertBase(text, negated);
        } else if (number.isSymbol(Sym.RomanNumeral)) {
            return convertRoman(text, negated);
        } else if (number.isSymbol(Sym.JapaneseNumeral)) {
            return convertJapanese(text, negated);
        } else if (number.isSymbol(Sym.Number)) {
            return NumberValue.fromUnknown(text, negated);
        } else return [new Decimal(NaN), undefined];
    }

    static fromUnknown(text: string, negated: boolean): NumberAndPrecision {
        const conversions = [
            convertDecimal,
            convertBase,
            convertJapanese,
            convertRoman,
        ];

        for (const conversion of conversions) {
            const [num, precision] = conversion(text, negated);
            if (!num.isNaN()) return [num, precision];
        }
        return [new Decimal(NaN), undefined];
    }

    isNotANumber(requestor: Expression): BoolValue {
        return new BoolValue(requestor, this.num.isNaN());
    }

    isInteger(requestor: Expression): BoolValue {
        return new BoolValue(requestor, this.num.isInteger());
    }

    toNumber(): number {
        return this.num.toNumber();
    }

    root(requestor: Expression, operand: NumberValue): NumberValue {
        return new NumberValue(
            requestor,
            this.num.pow(new Decimal(1).div(operand.num)),
            this.unit.root(operand.num.toNumber())
        );
    }

    negate(requestor: Expression): NumberValue {
        return new NumberValue(requestor, this.num.neg(), this.unit);
    }

    absolute(requestor: Expression): NumberValue {
        return new NumberValue(requestor, this.num.abs(), this.unit);
    }

    round(requestor: Expression): NumberValue {
        return new NumberValue(requestor, this.num.round(), this.unit);
    }

    add(requestor: Expression, operand: NumberValue): NumberValue {
        return new NumberValue(requestor, this.num.add(operand.num), this.unit);
    }

    subtract(requestor: Expression, operand: NumberValue): NumberValue {
        return new NumberValue(requestor, this.num.sub(operand.num), this.unit);
    }

    multiply(requestor: Expression, operand: NumberValue): NumberValue {
        return new NumberValue(
            requestor,
            this.num.times(operand.num),
            this.unit.product(operand.unit)
        );
    }

    divide(
        requestor: Expression,
        divisor: NumberValue
    ): NumberValue | NoneValue {
        return divisor.num.isZero()
            ? new NoneValue(requestor)
            : new NumberValue(
                  requestor,
                  this.num.dividedBy(divisor.num),
                  this.unit.quotient(divisor.unit)
              );
    }

    remainder(
        requestor: Expression,
        divisor: NumberValue
    ): NumberValue | NoneValue {
        return divisor.num.isZero()
            ? new NoneValue(requestor)
            : new NumberValue(
                  requestor,
                  this.num.modulo(divisor.num),
                  this.unit
              );
    }

    roundDown(requestor: Expression): NumberValue | NoneValue {
        return new NumberValue(requestor, this.num.floor(), this.unit);
    }

    roundUp(requestor: Expression): NumberValue | NoneValue {
        return new NumberValue(requestor, this.num.ceil(), this.unit);
    }

    isEqualTo(operand: Value): boolean {
        return (
            operand instanceof NumberValue &&
            this.num.equals(operand.num) &&
            this.unit.isEqualTo(operand.unit)
        );
    }

    greaterThan(requestor: Expression, operand: NumberValue): BoolValue {
        return new BoolValue(
            requestor,
            this.num.greaterThan(operand.num) &&
                this.unit.isEqualTo(operand.unit)
        );
    }

    lessThan(requestor: Expression, operand: NumberValue): BoolValue {
        return new BoolValue(
            requestor,
            this.num.lessThan(operand.num) && this.unit.isEqualTo(operand.unit)
        );
    }

    power(requestor: Expression, operand: NumberValue) {
        return new NumberValue(
            requestor,
            this.num.pow(operand.num),
            this.unit.power(operand.num.toNumber())
        );
    }

    cos(requestor: Expression) {
        return new NumberValue(requestor, this.num.cos(), this.unit);
    }

    sin(requestor: Expression) {
        return new NumberValue(requestor, this.num.sin(), this.unit);
    }

    getType() {
        return NumberType.make(this.unit);
    }

    getBasisTypeName(): BasisTypeName {
        return 'measurement';
    }

    unitless(requestor: Expression): NumberValue {
        return new NumberValue(requestor, this.num);
    }

    toWordplay(): string {
        return `${
            this.num.isNaN()
                ? '!#'
                : !this.num.isFinite()
                ? `${this.num.isPositive() ? '' : '-'}∞`
                : this.num.toString()
        }${this.unit.toString()}`;
    }

    getDescription(concretize: Concretizer, locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.term.number)
        );
    }

    getRepresentativeText() {
        return this.num.toString();
    }

    getSize() {
        return 1;
    }
}

const kanjiNumbers: Record<string, number> = {
    一: 1,
    二: 2,
    三: 3,
    四: 4,
    五: 5,
    六: 6,
    七: 7,
    八: 8,
    九: 9,
};

const kanjiOrders: Record<string, number> = {
    忽: 0.00001,
    糸: 0.0001,
    毛: 0.001,
    厘: 0.01,
    分: 0.1,
    十: 10,
    百: 100,
    千: 1000,
    万: 10000,
};

const romanNumerals: Record<string, number> = {
    Ⅰ: 1,
    Ⅱ: 2,
    Ⅲ: 3,
    Ⅳ: 4,
    Ⅴ: 5,
    Ⅵ: 6,
    Ⅶ: 7,
    Ⅷ: 8,
    Ⅸ: 9,
    Ⅹ: 10,
    Ⅺ: 11,
    Ⅻ: 12,
    Ⅼ: 50,
    Ⅽ: 100,
    Ⅾ: 500,
    Ⅿ: 1000,
};

function convertBase(text: string, negated: boolean): NumberAndPrecision {
    const [baseString, numString] = text.toString().split(';');
    const base = parseInt(baseString);
    if (isNaN(base) || numString === undefined)
        return [new Decimal(NaN), undefined];
    else {
        let text = numString;
        while (text.indexOf('_') >= 0)
            text = text.replace(
                '_',
                Decimal.random().times(base).floor().toString()
            );

        const [integral, fractional] = text.split('.');
        const integralDigits = integral
            .split('')
            .map((d) =>
                d === 'A'
                    ? 10
                    : d === 'B'
                    ? 11
                    : d === 'C'
                    ? 12
                    : d === 'D'
                    ? 13
                    : d === 'E'
                    ? 14
                    : d === 'F'
                    ? 15
                    : parseInt(d)
            );
        if (integralDigits.find((d) => d >= base) !== undefined) {
            return [new Decimal(NaN), undefined];
        } else {
            let num = new Decimal(0);
            let position = 0;
            while (integralDigits.length > 0) {
                const digit = integralDigits.pop() as number;
                num = num.plus(
                    new Decimal(digit).times(
                        new Decimal(base).pow(new Decimal(position))
                    )
                );
                position++;
            }

            if (fractional !== undefined) {
                position = 1;
                const fractionalDigits = fractional
                    .split('')
                    .map((d) =>
                        d === 'A'
                            ? 10
                            : d === 'B'
                            ? 11
                            : d === 'C'
                            ? 12
                            : d === 'D'
                            ? 13
                            : d === 'E'
                            ? 14
                            : d === 'F'
                            ? 15
                            : parseInt(d)
                    );
                while (fractionalDigits.length > 0) {
                    const digit = fractionalDigits.shift() as number;
                    num = num.plus(
                        new Decimal(digit).times(
                            new Decimal(base).pow(new Decimal(position).neg())
                        )
                    );
                    position++;
                }
            }

            return [num.times(negated ? -1 : 1), undefined];
        }
    }
}

function convertRoman(text: string, negated: boolean): NumberAndPrecision {
    // Sum these! Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ Ⅺ Ⅻ Ⅼ Ⅽ Ⅾ Ⅿ
    let numerals = text;
    let sum = new Decimal(0);
    let previous = undefined;
    while (numerals.length > 0) {
        const numeral = romanNumerals[numerals.charAt(0)];
        // Didn't find a matching symbol? Not a Roman numeral.
        if (numeral === undefined) return [new Decimal(NaN), undefined];
        sum = sum.plus(new Decimal(numeral));
        if ((numeral === 5 || numeral === 10) && previous === 1)
            sum = sum.minus(2);
        if ((numeral === 50 || numeral === 100) && previous === 10)
            sum = sum.minus(20);
        if ((numeral === 500 || numeral === 1000) && previous === 100)
            sum = sum.minus(200);
        numerals = numerals.substring(1);
        previous = numeral;
    }
    return [sum.times(negated ? -1 : 1), undefined];
}

function convertJapanese(text: string, negated: boolean): NumberAndPrecision {
    // Japanese numbers are  sum of products, read left to right.
    // For example, 千二百八十九 is
    // one 千 (1000's) + 二 (two) 百 (100's) + 八 (eight) 十 (10's) + 九 (nine) = 1289.
    let kanji = text;
    let sum = new Decimal(0);
    let previousOrder = undefined;
    while (kanji.length > 0) {
        // Is the next character a period?
        const period = kanji.charAt(0) === '・';
        // Skip the period.
        if (period) {
            kanji = kanji.substring(1);
            continue;
        }

        let multiplier = 1;

        // Is there a 0-9 arabic prefix? If so, parse it as an arabic multiplier.
        if (/^[0-9]/.test(kanji.charAt(0))) {
            let digits = '';
            while (kanji.length > 0 && /^[0-9]/.test(kanji.charAt(0))) {
                digits = digits + kanji.charAt(0);
                kanji = kanji.substring(1);
            }
            multiplier = parseInt(digits);
        }

        // Is there a 1-9 digit prefix? If so, parse it as a multiplier.
        let value = kanjiNumbers[kanji.charAt(0)];
        if (value >= 1 && value <= 9) {
            kanji = kanji.substring(1);
            multiplier = value;
        }

        // Is there another digit that's not a period? Parse the order.
        if (kanji.length > 0 && kanji.charAt(0) !== '・') {
            value = kanjiOrders[kanji.charAt(0)];
            kanji = kanji.substring(1);
            // If somehow a non-Kanji number snuck in, this isn't a valid number.
            // If this order of magnitude is greater than the previous one, this isn't a valid number.
            if (
                value === undefined ||
                (previousOrder !== undefined && value > previousOrder)
            ) {
                sum = new Decimal(NaN);
                break;
            }
            previousOrder = value;
            sum = sum.plus(new Decimal(multiplier).times(new Decimal(value)));
        } else sum = sum.plus(new Decimal(value));
    }

    return [sum.times(negated ? -1 : 1), undefined];
}

function convertDecimal(text: string, negated: boolean): NumberAndPrecision {
    // Is there a trailing %? Note it and strip it.
    const isPercent = text.endsWith('%');
    if (isPercent) text = text.substring(0, text.length - 1);

    // Note the precision of the token after the decimal point.
    const precision = text.split('.')[1]?.length ?? 0;

    try {
        // Set the number, accounting for percent.
        return [
            isPercent
                ? new Decimal(text).times(0.01).times(negated ? -1 : 1)
                : new Decimal(text).times(negated ? -1 : 1),
            precision,
        ];
    } catch (_) {
        return [new Decimal(NaN), undefined];
    }
}
