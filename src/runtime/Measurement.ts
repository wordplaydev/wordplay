import Token, { TokenType } from "../nodes/Token";
import Unit from "../nodes/Unit";
import Bool from "./Bool";
import Exception, { ExceptionType } from "./Exception";
import None from "./None";
import Value from "./Value";
import Decimal from 'decimal.js';
import MeasurementStructureType from "../native/MeasurementStructureType";
import Alias from "../nodes/Alias";

/** A decimal number with a unit.
 * If all of it's parts are empty, it is not a number.
 * If it's numerator 
 */
export default class Measurement extends Value {

    readonly num: Decimal;
    readonly unit: Unit;

    constructor(number: number | Token | Decimal, unit?: Unit) {
        super();

        // If it's a token, convert the string.
        if(number instanceof Decimal) {
            this.num = number;
        }
        else if(number instanceof Token) {
            if(number.is(TokenType.DECIMAL)) {

                // Randomize any underscore digits.
                let text = number.text;
                while(text.indexOf("_") >= 0)
                    text = text.replace("_", Decimal.random().times(10).floor().toString());

                // Set the number.
                this.num = new Decimal(text);
            }
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
            else if(number.is(TokenType.PI)) {
                this.num = Decimal.acos(-1);
            }
            else {
            // else if(number.is(TokenType.JAPANESE)) {
            // else if(number.is(TokenType.INFINITY)) {
                this.num = new Decimal(NaN);
                // TODO
                // this.positive = true;
                // this.digits = [];
                // this.exponent = 0;
                // this.numerator = [];
                // this.denominator = [];
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