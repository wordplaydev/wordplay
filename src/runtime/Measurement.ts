import Token, { TokenType } from "../nodes/Token";
import Unit from "../nodes/Unit";
import Bool from "./Bool";
import Exception, { ExceptionType } from "./Exception";
import None from "./None";
import Value from "./Value";
import Decimal from 'decimal.js';
import MeasurementStructureType from "../native/MeasurementStructureType";
import Alias from "../nodes/Alias";

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

/** A decimal number with a unit.
 * If all of it's parts are empty, it is not a number.
 * If it's numerator 
 */
export default class Measurement extends Value {

    readonly num: Decimal;
    readonly unit: Unit;

    constructor(number: number | Token | Decimal, unit?: Unit) {
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
                let text = number.text;
                while(text.indexOf("_") >= 0)
                    text = text.replace("_", Decimal.random().times(10).floor().toString());

                // Set the number.
                this.num = new Decimal(text);
            }
            // If it matches a number with a different base, convert it to a Decimal.
            else if(number.is(TokenType.BASE)) {
                const [ baseString, numString ] = number.text.split(";");
                const base = parseInt(baseString);
                if(isNaN(base))
                    this.num = new Decimal(NaN);
                else {

                    let text = numString;
                    while(text.indexOf("_") >= 0)
                        text = text.replace("_", Decimal.random().times(base).floor().toString());
    
                    const [ integral, fractional ] = text.split(".");
                    const integralDigits = integral.split("").map(d => d === "A" ? 10 : d === "B" ? 11 : d === "C" ? 12 : d === "D" ? 13 : d === "E" ? 14 : d === "F" ? 15 : Number(d));
                    if(integralDigits.find(d => d >= base) !== undefined) {
                        this.num = new Decimal(NaN);
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
                        
                        this.num = num;
                    }
                }
            }
            else if(number.is(TokenType.JAPANESE)) {

                // Japanese numbers are  sum of products, read left to right.
                // For example, 千二百八十九 is
                // one 千 (1000's) + 二 (two) 百 (100's) + 八 (eight) 十 (10's) + 九 (nine) = 1289.
                let kanji = number.text;
                let sum = 0;
                let previousOrder = undefined;
                while(kanji.length > 0) {

                    // Is the next character a period?
                    const period = kanji.charAt(0) === ".";
                    // Skip the period.
                    if(period) {
                        kanji = kanji.substring(1);
                        continue;
                    }

                    // Is there a 1-9 digit prefix? If so, parse it as a multiplier.
                    let value = kanjiNumbers[kanji.charAt(0)];
                    let multiplier = 1;
                    if(value >= 1 && value <= 9) {
                        kanji = kanji.substring(1);
                        multiplier = value;
                    }

                    // Is there another digit that's not a period? Parse the order.
                    if(kanji.length > 0 && kanji.charAt(0) !== ".") {
                        value = kanjiOrders[kanji.charAt(0)];
                        kanji = kanji.substring(1);
                        // If somehow a non-Kanji number snuck in, this isn't a valid number.
                        // If this order of magnitude is greater than the previous one, this isn't a valid number.
                        if(value === undefined && (previousOrder !== undefined && value > previousOrder)) {
                            sum = NaN;
                            break;
                        }
                        previousOrder = value;    
                        sum += multiplier * value;
                    }
                    else sum += value;

                }

                this.num = new Decimal(sum);

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
        else {
            this.num = new Decimal(NaN);
        }

        this.unit = unit === undefined ? new Unit([], []) : unit;
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

    evaluatePrefix(operator: string): Measurement | Exception {

        switch(operator) {
            case "-": 
                return this.negate();
                // return new Measurement([ !this.positive, this.digits, this.exponent, this.numerator, this.denominator ] , this.unit);
            case "√":  
                // TODO Fix the unit on square roots.
                return new Measurement(this.num.sqrt(), this.unit);
                // return new Measurement(Math.sqrt(this.toNumber()), this.unit);
            default: 
                return new Exception(ExceptionType.UNKNOWN_OPERATOR);
        }

    }

    evaluateInfix(operator: string, right: Value): Measurement | Bool | Exception | None {
        if(!(right instanceof Measurement)) 
            return new Exception(ExceptionType.EXPECTED_TYPE);
    
        switch(operator) {
            case "+":
                return this.unit.toString() === right.unit.toString() ?
                    this.add(right) :
                    new Exception(ExceptionType.EXPECTED_TYPE)
            case "-":
                return this.unit.toString() === right.unit.toString() ?
                    this.subtract(right) :
                    new Exception(ExceptionType.EXPECTED_TYPE)
            case "×":
            case "*":
            case "·": return this.multiply(right);
            case "÷": return this.divide(right);
            case "%": return this.remainder(right);
            case "^": return this.power(right);
            case "<": return this.lessThan(right);
            case ">": return this.greaterThan(right);
            case "≤": return this.lessThan(right) || this.equals(right);
            case "≥": return this.greaterThan(right) || this.equals(right);
            case "=": return this.equals(right);
            case "≠": return new Bool(!this.equals(right));
            default: return new Exception(ExceptionType.UNKNOWN_OPERATOR);
        }
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
        return new Measurement(this.num.times(operand.num),
            new Unit(
                this.unit.numerator.concat(operand.unit.numerator),
                this.unit.denominator.concat(operand.unit.denominator)
            )
        );
    }

    // isZero() { return this.digits.length === 1 && this.digits[0] === 0 && this.numerator.length === 0; }

    divide(divisor: Measurement): Measurement | None {
        return divisor.num.isZero() ? 
            new None([new Alias("nan")]) : 
            new Measurement(
                this.num.dividedBy(divisor.num), 
                new Unit(
                    this.unit.numerator.concat(divisor.unit.numerator),
                    this.unit.denominator.concat(divisor.unit.denominator)
                )
            );
    }

    remainder(divisor: Measurement): Measurement | None {
        return divisor.num.isZero() ? 
            new None([new Alias("nan")]) : 
            new Measurement(
                this.num.modulo(divisor.num), 
                this.unit
            );
    }

    /** Equal if all of their parts are equal. */
    equals(operand: Measurement): Bool {
        return new Bool(this.num.equals(operand.num));        
    }

    greaterThan(operand: Measurement): Bool {
        return new Bool(this.num.greaterThan(operand.num));
        
    }

    lessThan(operand: Measurement): Bool {
        return new Bool(this.num.lessThan(operand.num));        
    }

    power(operand: Measurement) {

        return new Measurement(this.num.pow(operand.num), this.unit);

    }

    getType() { return MeasurementStructureType; }

    toString() { 
        return `${this.num.toString()}${this.unit.toString()}`;
    }

}