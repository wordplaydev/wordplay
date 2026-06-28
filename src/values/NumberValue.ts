import type LocaleText from '@locale/LocaleText';
import getConceptName from '@locale/getConceptName';
import NumberType from '@nodes/NumberType';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Unit from '@nodes/Unit';
import BoolValue from '@values/BoolValue';
import NoneValue from '@values/NoneValue';
import Decimal from 'decimal.js';
import type { BasisTypeName } from '@basis/BasisConstants';
import type Expression from '@nodes/Expression';
import type Value from '@values/Value';
import SimpleValue from '@values/SimpleValue';

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
        precision?: number,
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
            const [num, precision] = NumberValue.fromUnknown(number);
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

        let num;
        let precision;

        // Not a number
        if (text === '!#') return [new Decimal(NaN), undefined];
        // Infinity
        else if (number.isSymbol(Sym.Infinity) || text === '∞') {
            [num, precision] = [
                new Decimal(Infinity * (negated ? -1 : 1)),
                undefined,
            ];
        }
        // Pi
        else if (number.isSymbol(Sym.Pi) || text === 'π') {
            [num, precision] = [
                new Decimal(Math.PI * (negated ? -1 : 1)),
                Decimal.precision,
            ];
        }
        // If it matches the decimal pattern, randomize requested digits, then convert to a Decimal.
        else if (number.isSymbol(Sym.Decimal)) {
            [num, precision] = convertDecimal(text);
        }
        // If it matches a number with a different base, convert it to a Decimal.
        else if (number.isSymbol(Sym.Base)) {
            [num, precision] = convertBase(text);
        } else if (number.isSymbol(Sym.RomanNumeral)) {
            [num, precision] = convertRoman(text);
        } else if (number.isSymbol(Sym.HanNumeral)) {
            [num, precision] = convertHan(text);
        } else if (number.isSymbol(Sym.ThaiNumeral)) {
            [num, precision] = convertThai(text);
        } else if (number.isSymbol(Sym.BengaliNumeral)) {
            [num, precision] = convertBengali(text);
        } else if (number.isSymbol(Sym.DevanagariNumeral)) {
            [num, precision] = convertDevanagari(text);
        } else if (number.isSymbol(Sym.GujaratiNumeral)) {
            [num, precision] = convertGujarati(text);
        } else if (number.isSymbol(Sym.GurmukhiNumeral)) {
            [num, precision] = convertGurmukhi(text);
        } else if (number.isSymbol(Sym.KannadaNumeral)) {
            [num, precision] = convertKannada(text);
        } else if (number.isSymbol(Sym.TamilNumeral)) {
            [num, precision] = convertTamil(text);
        } else if (number.isSymbol(Sym.TeluguNumeral)) {
            [num, precision] = convertTelugu(text);
        } else if (number.isSymbol(Sym.Number)) {
            [num, precision] = NumberValue.fromUnknown(text);
        } else [num, precision] = [new Decimal(NaN), undefined];

        return [num.times(negated ? -1 : 1), precision];
    }

    static fromUnknown(text: string): NumberAndPrecision {
        // All number formats can be negated. Check for it, then remove it.
        const negated = text.charAt(0) === '-';
        if (negated) text = text.substring(1);

        const conversions = [
            convertDecimal,
            convertBase,
            convertHan,
            convertRoman,
            convertThai,
            convertBengali,
            convertDevanagari,
            convertGujarati,
            convertGurmukhi,
            convertKannada,
            convertTamil,
            convertTelugu,
        ];

        for (const conversion of conversions) {
            const [num, precision] = conversion(text);
            if (!num.isNaN()) return [num.times(negated ? -1 : 1), precision];
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
            this.unit.root(operand.num.toNumber()),
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
            this.unit.product(operand.unit),
        );
    }

    divide(
        requestor: Expression,
        divisor: NumberValue,
    ): NumberValue | NoneValue {
        return divisor.num.isZero()
            ? new NoneValue(requestor)
            : new NumberValue(
                  requestor,
                  this.num.dividedBy(divisor.num),
                  this.unit.quotient(divisor.unit),
              );
    }

    remainder(
        requestor: Expression,
        divisor: NumberValue,
    ): NumberValue | NoneValue {
        return divisor.num.isZero()
            ? new NoneValue(requestor)
            : new NumberValue(
                  requestor,
                  this.num.modulo(divisor.num),
                  this.unit,
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
                this.unit.isEqualTo(operand.unit),
        );
    }

    lessThan(requestor: Expression, operand: NumberValue): BoolValue {
        return new BoolValue(
            requestor,
            this.num.lessThan(operand.num) && this.unit.isEqualTo(operand.unit),
        );
    }

    power(requestor: Expression, operand: NumberValue) {
        return new NumberValue(
            requestor,
            this.num.pow(operand.num),
            this.unit.power(operand.num.toNumber()),
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

    getDescription() {
        return (l: LocaleText) => getConceptName(l, 'number');
    }

    getRepresentativeText() {
        return this.num.toString();
    }

    getSize() {
        return 1;
    }
}

const hanNumbers: Record<string, number> = {
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

const hanOrders: Record<string, number> = {
    忽: 0.00001,
    糸: 0.0001,
    毛: 0.001,
    厘: 0.01,
    分: 0.1,
    十: 10,
    百: 100,
    千: 1000,
    万: 10000,
    億: 100000000,
    兆: 1000000000000,
};

// Positional numeral digit maps. Each script's ten digits translate one-to-one
// to Arabic '0'–'9'; the converter shares a single helper.
const thaiDigits: Record<string, string> = {
    '๐': '0',
    '๑': '1',
    '๒': '2',
    '๓': '3',
    '๔': '4',
    '๕': '5',
    '๖': '6',
    '๗': '7',
    '๘': '8',
    '๙': '9',
};

const bengaliDigits: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
};

const devanagariDigits: Record<string, string> = {
    '०': '0',
    '१': '1',
    '२': '2',
    '३': '3',
    '४': '4',
    '५': '5',
    '६': '6',
    '७': '7',
    '८': '8',
    '९': '9',
};

const gujaratiDigits: Record<string, string> = {
    '૦': '0',
    '૧': '1',
    '૨': '2',
    '૩': '3',
    '૪': '4',
    '૫': '5',
    '૬': '6',
    '૭': '7',
    '૮': '8',
    '૯': '9',
};

const gurmukhiDigits: Record<string, string> = {
    '੦': '0',
    '੧': '1',
    '੨': '2',
    '੩': '3',
    '੪': '4',
    '੫': '5',
    '੬': '6',
    '੭': '7',
    '੮': '8',
    '੯': '9',
};

const kannadaDigits: Record<string, string> = {
    '೦': '0',
    '೧': '1',
    '೨': '2',
    '೩': '3',
    '೪': '4',
    '೫': '5',
    '೬': '6',
    '೭': '7',
    '೮': '8',
    '೯': '9',
};

const tamilDigits: Record<string, string> = {
    '௦': '0',
    '௧': '1',
    '௨': '2',
    '௩': '3',
    '௪': '4',
    '௫': '5',
    '௬': '6',
    '௭': '7',
    '௮': '8',
    '௯': '9',
};

const teluguDigits: Record<string, string> = {
    '౦': '0',
    '౧': '1',
    '౨': '2',
    '౩': '3',
    '౪': '4',
    '౫': '5',
    '౬': '6',
    '౭': '7',
    '౮': '8',
    '౯': '9',
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

function convertBase(text: string): NumberAndPrecision {
    const [baseString, numString] = text.toString().split(';');
    const base = parseInt(baseString);
    if (isNaN(base) || numString === undefined)
        return [new Decimal(NaN), undefined];
    else {
        let text = numString;
        while (text.indexOf('_') >= 0)
            text = text.replace(
                '_',
                Decimal.random().times(base).floor().toString(),
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
                              : parseInt(d),
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
                        new Decimal(base).pow(new Decimal(position)),
                    ),
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
                                      : parseInt(d),
                    );
                while (fractionalDigits.length > 0) {
                    const digit = fractionalDigits.shift() as number;
                    num = num.plus(
                        new Decimal(digit).times(
                            new Decimal(base).pow(new Decimal(position).neg()),
                        ),
                    );
                    position++;
                }
            }

            return [num, undefined];
        }
    }
}

function convertRoman(text: string): NumberAndPrecision {
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
    return [sum, undefined];
}

function convertHan(text: string): NumberAndPrecision {
    // Han (CJK) numbers use nested myriad grouping: digits and small orders
    // (十百千) accumulate into a "group" that is then multiplied by the next big
    // unit (万/億/兆) it meets. For example, 二億三千四百五十六万七千八百九十 is
    // 2·10⁸ + 3456·10⁴ + 7890, because the 万 multiplies the entire 3456 that
    // precedes it, not just the immediately preceding digit. A linear sum-of-
    // products won't get this right; we maintain three accumulators (sum,
    // group, pending) and drain them at big-unit boundaries.
    let sum = new Decimal(0);
    let group = new Decimal(0);
    let pending = new Decimal(0);
    let i = 0;
    while (i < text.length) {
        const c = text.charAt(i);
        // Fractional separator: flush any pending digit into the group, then
        // continue — fractional orders are small orders that accumulate the
        // same way (分=0.1, 厘=0.01, ...).
        if (c === '・') {
            group = group.plus(pending);
            pending = new Decimal(0);
            i++;
            continue;
        }
        // Arabic digit prefix.
        if (/[0-9]/.test(c)) {
            let digits = '';
            while (i < text.length && /[0-9]/.test(text.charAt(i))) {
                digits += text.charAt(i);
                i++;
            }
            pending = new Decimal(parseInt(digits));
            continue;
        }
        // Han digit (一–九).
        const digit = hanNumbers[c];
        if (digit !== undefined) {
            pending = new Decimal(digit);
            i++;
            continue;
        }
        // Order character.
        const order = hanOrders[c];
        if (order === undefined) return [new Decimal(NaN), undefined];
        if (order >= 10000) {
            // Big myriad unit (万/億/兆): drain group + pending, multiply.
            const effective =
                group.eq(0) && pending.eq(0)
                    ? new Decimal(1)
                    : group.plus(pending);
            sum = sum.plus(effective.times(new Decimal(order)));
            group = new Decimal(0);
        } else {
            // Small order (十/百/千) or fractional order (分/厘/毛/糸/忽):
            // multiply the pending digit by the order and add to the group.
            // A leading order with no digit (e.g. 十 alone = 10) gets an
            // implicit multiplier of 1.
            const multiplier = pending.eq(0) ? new Decimal(1) : pending;
            group = group.plus(multiplier.times(new Decimal(order)));
        }
        pending = new Decimal(0);
        i++;
    }
    return [sum.plus(group).plus(pending), undefined];
}

function convertPositional(
    text: string,
    digits: Record<string, string>,
): NumberAndPrecision {
    // Translate each script-specific digit to its Arabic equivalent, preserve
    // the decimal separator and percent suffix, then defer to the decimal
    // converter for precision tracking.
    let translated = '';
    for (const c of text) {
        if (digits[c] !== undefined) translated += digits[c];
        else if (c === '.' || c === ',' || c === '%') translated += c;
        else return [new Decimal(NaN), undefined];
    }
    return convertDecimal(translated);
}

const convertThai = (text: string) => convertPositional(text, thaiDigits);
const convertBengali = (text: string) => convertPositional(text, bengaliDigits);
const convertDevanagari = (text: string) =>
    convertPositional(text, devanagariDigits);
const convertGujarati = (text: string) =>
    convertPositional(text, gujaratiDigits);
const convertGurmukhi = (text: string) =>
    convertPositional(text, gurmukhiDigits);
const convertKannada = (text: string) => convertPositional(text, kannadaDigits);
const convertTamil = (text: string) => convertPositional(text, tamilDigits);
const convertTelugu = (text: string) => convertPositional(text, teluguDigits);

function convertDecimal(text: string): NumberAndPrecision {
    // Is there a trailing %? Note it and strip it.
    const isPercent = text.endsWith('%');
    if (isPercent) text = text.substring(0, text.length - 1);

    // Note the precision of the token after the decimal point.
    const precision = text.split('.')[1]?.length ?? 0;

    try {
        // Set the number, accounting for percent.
        return [
            isPercent ? new Decimal(text).times(0.01) : new Decimal(text),
            precision,
        ];
    } catch (_) {
        return [new Decimal(NaN), undefined];
    }
}
