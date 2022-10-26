import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import Unit from "../nodes/Unit";
import Bool from "./Bool";
import None from "./None";
import Decimal from 'decimal.js';
import Name from "../nodes/Name";
import Primitive from "./Primitive";
import MeasurementType from "../nodes/MeasurementType";
import { MEASUREMENT_NATIVE_TYPE_NAME } from "../native/NativeConstants";
import type Value from "./Value";
import Names from "../nodes/Names";

/** A decimal number with a unit.
 * If all of it's parts are empty, it is not a number.
 * If it's numerator 
 */
export default class Measurement extends Primitive {

    readonly num: Decimal;
    readonly unit: Unit;

    constructor(number: number | Token | Decimal | string, unit?: Unit) {
        super();

        // If the number given is a Decimal, just assign it.
        if(number instanceof Decimal) {
            this.num = number;
        }
        // If the number is a token, convert it to a Decimal.
        else if(number instanceof Token) {
            // Infinity
            if(number.is(TokenType.INFINITY)) {
                this.num = new Decimal(Infinity);
            }
            // If it matches the decimal pattern, randomize requested digits, then convert to a Decimal.
            else if(number.is(TokenType.DECIMAL)) {

                // Randomize any underscore digits.
                let text = number.text.toString();
                while(text.indexOf("_") >= 0)
                    text = text.toString().replace("_", Decimal.random().times(10).floor().toString());

                // Is there a trailing %? Strip it.
                const isPercent = text.charAt(text.length - 1) === "%";
                if(isPercent) text = text.substring(0, text.length - 1);

                // Set the number, accounting for percent.
                this.num = isPercent ? (new Decimal(text)).mul(0.01) : new Decimal(text);

            }
            // If it matches a number with a different base, convert it to a Decimal.
            else if(number.is(TokenType.BASE)) {
                this.num = convertBase(number.text.toString());
            }
            else if(number.is(TokenType.ROMAN)) {
                this.num = convertRoman(number.text.toString());
            }
            else if(number.is(TokenType.JAPANESE)) {
                this.num = convertJapanese(number.text.toString());
            }
            // If it matches the Pi token, convert to Pi.
            else if(number.is(TokenType.PI)) {
                this.num = Decimal.acos(-1);
            }
            else {
                this.num = new Decimal(NaN);
            }
        }
        // If it's a Javascript floating point, convert.
        else if(typeof number === "number") {
            this.num = new Decimal(number);
        }
        // If it's a string, try to convert it from one of our known formats to decimal.
        else if(typeof number === "string") {
            this.num = convertUnknown(number);
        }
        // Otherwise, we don't know what it is.
        else {
            this.num = new Decimal(NaN);
        }

        this.unit = unit === undefined ? new Unit() : unit;
    }

    isNotANumber(): Bool {
        return new Bool(this.num.isNaN());
    }

    isInteger(): Bool { 
        return new Bool(this.num.isInteger());
    }

    toNumber(): number { 
        return this.num.toNumber();
    }

    sqrt(): Measurement {
        return new Measurement(this.num.sqrt(), this.unit.sqrt());
    }

    negate(): Measurement {
        return new Measurement(this.num.neg(), this.unit);
    }

    absolute(): Measurement {
        return new Measurement(this.num.abs(), this.unit);
    }

    add(operand: Measurement): Measurement {
        return new Measurement(this.num.add(operand.num), this.unit);
    }

    subtract(operand: Measurement): Measurement {
        return new Measurement(this.num.sub(operand.num), this.unit);
    }

    multiply(operand: Measurement): Measurement {
        return new Measurement(this.num.times(operand.num), this.unit.product(operand.unit));
    }

    divide(divisor: Measurement): Measurement | None {
        return divisor.num.isZero() ? 
            new None(new Names([new Name("nan")])) : 
            new Measurement(this.num.dividedBy(divisor.num), this.unit.quotient(divisor.unit))
    }

    remainder(divisor: Measurement): Measurement | None {
        return divisor.num.isZero() ? 
            new None(new Names([new Name("nan")])) : 
            new Measurement(this.num.modulo(divisor.num), this.unit);
    }

    isEqualTo(operand: Value): boolean {
        return operand instanceof Measurement && this.num.equals(operand.num) && this.unit.isEqualTo(operand.unit);
    }

    greaterThan(operand: Measurement): Bool {
        return new Bool(this.num.greaterThan(operand.num) && this.unit.isEqualTo(operand.unit));    
    }

    lessThan(operand: Measurement): Bool {
        return new Bool(this.num.lessThan(operand.num) && this.unit.isEqualTo(operand.unit));        
    }

    power(operand: Measurement) {
        return new Measurement(this.num.pow(operand.num), this.unit.power(operand.num.toNumber()));
    }

    getType() { return new MeasurementType(undefined, this.unit); }
    
    getNativeTypeName(): string { return MEASUREMENT_NATIVE_TYPE_NAME; }

    unitless(): Measurement { return new Measurement(this.num); }

    withUnit(unit: Unit): Measurement { return new Measurement(this.num, unit); }
    
    toString() { 
        return `${this.num.toString()}${this.unit.toString()}`;
    }

}

const kanjiNumbers: Record<string, number> = {
    "一": 1,
    "二": 2,
    "三": 3, 
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9
};

const kanjiOrders: Record<string, number> = {
    "忽": 0.00001,
    "糸": 0.0001,
    "毛": 0.001,
    "厘": 0.01,
    "分": 0.1,
    "十": 10,
    "百": 100,
    "千": 1000,
    "万": 10000
}

const romanNumerals: Record<string, number> = {
    "Ⅰ": 1,
    "Ⅱ": 2,
    "Ⅲ": 3,
    "Ⅳ": 4, 
    "Ⅴ": 5,
    "Ⅵ": 6,
    "Ⅶ": 7,
    "Ⅷ": 8,
    "Ⅸ": 9,
    "Ⅹ": 10,
    "Ⅺ": 11,
    "Ⅻ": 12,
    "Ⅼ": 50,
    "Ⅽ": 100,
    "Ⅾ": 500,
    "Ⅿ": 1000
};

function convertBase(text: string): Decimal {
    const [ baseString, numString ] = text.toString().split(";");
    const base = parseInt(baseString);
    if(isNaN(base) || numString === undefined)
        return new Decimal(NaN);
    else {

        let text = numString;
        while(text.indexOf("_") >= 0)
            text = text.replace("_", Decimal.random().times(base).floor().toString());

        const [ integral, fractional ] = text.split(".");
        const integralDigits = integral.split("").map(d => d === "A" ? 10 : d === "B" ? 11 : d === "C" ? 12 : d === "D" ? 13 : d === "E" ? 14 : d === "F" ? 15 : Number(d));
        if(integralDigits.find(d => d >= base) !== undefined) {
            return new Decimal(NaN);
        }
        else {
            let num = new Decimal(0);
            let position = 0;
            while(integralDigits.length > 0) {
                const digit = integralDigits.pop() as number;
                num = num.plus(new Decimal(digit).times(new Decimal(base).pow(new Decimal(position))));
                position++;
            }

            if(fractional !== undefined) {
                position = 1;
                const fractionalDigits = fractional.split("").map(d => d === "A" ? 10 : d === "B" ? 11 : d === "C" ? 12 : d === "D" ? 13 : d === "E" ? 14 : d === "F" ? 15 : Number(d));
                while(fractionalDigits.length > 0) {
                    const digit = fractionalDigits.shift() as number;
                    num = num.plus(new Decimal(digit).times(new Decimal(base).pow(new Decimal(position).neg())));
                    position++;
                }
            }                        
            
            return num;
        }
    }

}

function convertRoman(text: string): Decimal {

    // Sum these! Ⅰ Ⅱ Ⅲ Ⅳ Ⅴ Ⅵ Ⅶ Ⅷ Ⅸ Ⅹ Ⅺ Ⅻ Ⅼ Ⅽ Ⅾ Ⅿ
    let numerals = text;
    let sum = new Decimal(0);
    let previous = undefined;
    while(numerals.length > 0) {
        const numeral = romanNumerals[numerals.charAt(0)];
        // Didn't find a matching symbol? Not a Roman numeral.
        if(numeral === undefined) return new Decimal(NaN);
        sum = sum.plus(new Decimal(numeral));
        if((numeral === 5 || numeral === 10) && previous === 1)
            sum = sum.minus(2);
        if((numeral === 50 || numeral === 100) && previous === 10)
            sum = sum.minus(20);
        if((numeral === 500 || numeral === 1000) && previous === 100)
            sum = sum.minus(200);
        numerals = numerals.substring(1);
        previous = numeral;
    }
    return sum;

}

function convertJapanese(text: string): Decimal {
    // Japanese numbers are  sum of products, read left to right.
    // For example, 千二百八十九 is
    // one 千 (1000's) + 二 (two) 百 (100's) + 八 (eight) 十 (10's) + 九 (nine) = 1289.
    let kanji = text;
    let sum = new Decimal(0);
    let previousOrder = undefined;
    while(kanji.length > 0) {

        // Is the next character a period?
        const period = kanji.charAt(0) === "・";
        // Skip the period.
        if(period) {
            kanji = kanji.substring(1);
            continue;
        }

        let multiplier = 1;

        // Is there a 0-9 arabic prefix? If so, parse it as an arabic multiplier.
        if(/^[0-9]/.test(kanji.charAt(0))) {
            let digits = "";
            while(kanji.length > 0 && /^[0-9]/.test(kanji.charAt(0))) {
                digits = digits + kanji.charAt(0);
                kanji = kanji.substring(1);
            }
            multiplier = parseInt(digits);
        }

        // Is there a 1-9 digit prefix? If so, parse it as a multiplier.
        let value = kanjiNumbers[kanji.charAt(0)];
        if(value >= 1 && value <= 9) {
            kanji = kanji.substring(1);
            multiplier = value;
        }

        // Is there another digit that's not a period? Parse the order.
        if(kanji.length > 0 && kanji.charAt(0) !== "・") {
            value = kanjiOrders[kanji.charAt(0)];
            kanji = kanji.substring(1);
            // If somehow a non-Kanji number snuck in, this isn't a valid number.
            // If this order of magnitude is greater than the previous one, this isn't a valid number.
            if(value === undefined || (previousOrder !== undefined && value > previousOrder)) {
                sum = new Decimal(NaN);
                break;
            }
            previousOrder = value;    
            sum = sum.plus(new Decimal(multiplier).times(new Decimal(value)));
        }
        else sum = sum.plus(new Decimal(value));

    }

    return sum;

}

function convertDecimal(text: string) { 

    try {
        return new Decimal(text); 
    } catch(error) {
        return new Decimal(NaN);
    }

}

function convertUnknown(text: string) {

    const conversions = [
        convertDecimal,
        convertBase,
        convertJapanese,
        convertRoman
    ];

    for(const conversion of conversions) {
        const result = conversion(text);
        if(!result.isNaN()) return result;
    }
    return new Decimal(NaN);

}