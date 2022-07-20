import Token, { TokenType } from "../nodes/Token";
import Unit from "../nodes/Unit";
import Bool from "./Bool";
import Exception, { ExceptionType } from "./Exception";
import None from "./None";
import Value from "./Value";
import Decimal from 'decimal.js';

/** A decimal number with a unit.
 * If all of it's parts are empty, it is not a number.
 * If it's numerator 
 */
export default class Measurement extends Value {

    readonly num: Decimal;

    // DEPRECATED
    // Decided to abandon precision. It was getting too complex to be useful.
    // I may return to it later to if precision becomes an issue, and if so
    // use one of the well-tested libraries that implements arbitrary precision decimal arithmetic.

    // /** True if the number is positive, false if negative */
    // readonly positive: boolean;

    // /** The integer part */
    // readonly digits: number[];

    // /** The fractional, irrational part */
    // readonly exponent: number;

    // /** The numerator of the rational part */
    // readonly numerator: number[];

    // /** The denominator of the rational part */
    // readonly denominator: number[];

    readonly unit: Unit;

    constructor(number: number | Token | Decimal, unit?: Unit) {
        super();

        // If it's an array of parts, just assign them
        // if(Array.isArray(number) && number.length === 5) {
            // this.positive = number[0];
            // this.digits = number[1];
            // this.exponent = number[2];
            // this.numerator = number[3];
            // this.denominator = number[4];
        // }
        // If it's a token, convert the string.
        if(number instanceof Decimal) {
            this.num = number;
        }
        else if(number instanceof Token) {
            if(number.is(TokenType.DECIMAL)) {

                this.num = new Decimal(number.text);
                // // Remove zeros on the front until reaching a digit or the decimal point.
                // let digits = number.text;
                // while(digits.charAt(0) === "0" && digits.length > 1 && digits.charAt(0) !== ".") 
                //     digits = digits.substring(1);
                // // If this has a decimal point, remove trailing zeroes until reaching it or a non-zero digit.
                // if(digits.indexOf(".") >= 0)
                //     while(digits.charAt(digits.length - 1) === "0" && digits.charAt(digits.length - 1) !== ".") 
                //         digits = digits.substring(0, digits.length - 2);
                // // Split into the two halves.
                // const [ integral, fractional ] = digits.split(".");
                // // All measurements from tokens start positive. We don't tokenize negative ones.
                // this.positive = true;
                // // Combine the digits without the decimal point.
                // this.digits = String(integral + (fractional ?? "")).split("").map(s => Number(s));
                // // The exponent 
                // this.exponent = -(fractional === undefined ? 0 : fractional.length);
                // // Adjust exponent to remove trailing zero digits.
                // while(this.digits[this.digits.length - 1] === 0) {
                //     this.digits.pop();
                //     this.exponent++;
                // }
                // // No fraction initially.
                // this.numerator = [];
                // this.denominator = [];
            }
            else if(number.is(TokenType.BASE)) {
                const [ baseString, numString ] = number.text.split(";");
                const base = parseInt(baseString);
                if(isNaN(base))
                    this.num = new Decimal(NaN);
                else {
                    const [ integral, fractional ] = numString.split(".");
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
                // this.positive = true;
                // this.digits = [ 3, 1,4,1,5,9, 2,6,5,3,5, 8,9,7,9,3, 2,3,8,4,6, 2,6,4,3,3, 8,3,2,7,9, 5,0,2,8,8, 4,1,9,7,1, 6,9,3,9,9, 3,7,5,1,0 ];
                // this.exponent = -50;
                // this.numerator = [];
                // this.denominator = [];
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
            // const [ integral, fractional ] = Math.abs(number).toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 20 }).split(".");
            // this.positive = number >= 0;
            // this.digits = [ ...integral.split("").map(s => Number(s)), ...(fractional === undefined ? [] : fractional.split("").map(s => Number(s))) ];
            // this.exponent = -(fractional === undefined ? 0 : fractional.length);
            // while(this.digits.length > 1 && this.digits[this.digits.length - 1] === 0) {
            //     this.digits.pop();
            //     this.exponent++;
            // }
            // this.numerator = [];
            // this.denominator = [];
        }
        else {
            this.num = new Decimal(NaN);
            // this.positive = true;
            // this.digits = [];
            // this.exponent = 0;
            // this.numerator = [];
            // this.denominator = [];
        }

        this.unit = unit === undefined ? new Unit([], []) : unit;
    }

    isNotANumber() { 
        this.num.isNaN();
        // return this.digits.length === 0 && this.numerator.length === 0 && this.denominator.length === 0; 
    }

    isInteger() { 
        return this.num.isInteger();
        // return this.exponent === this.digits.length && this.numerator.length === 0; 
    }

    toNumber(): number { 

        return this.num.toNumber();
        // if(this.isNotANumber()) return NaN;

        // const float = Number(`${this.digits.slice(0, this.exponent).join("")}.${this.digits.slice(this.exponent).join}`);
        // const rational = Number(this.numerator.join("")) / Number(this.denominator.join(""));
        // return isNaN(float) ? NaN : isNaN(rational) ? NaN : float + rational;

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

    evaluateInfix(operator: string, right: Value) {

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
            // TODO Implement
            case "^": return this.power(right);
            case "<": return this.lessThan(right);
            case ">": return this.greaterThan(right);
            case "≤": return this.lessThan(right) || this.equals(right);
            case "≥": return this.greaterThan(right) || this.equals(right);
            case "=": return this.equals(right);
            case "≠": return !this.equals(right);
            default: return new Exception(ExceptionType.UNKNOWN_OPERATOR);
        }

    }

    // static addDigits(top: number[], bottom: number[]): number[] {

    //     while(top.length < bottom.length)
    //         top.unshift(0);
    //     while(bottom.length < top.length)
    //         bottom.unshift(0);

    //     let carry = 0;
    //     let digits: number[] = [];
    //     for(let position = top.length - 1; position >= 0; position--) {
    //         const topDigit = top[position];
    //         const bottomDigit = bottom[position];
    //         const sum: number = topDigit + bottomDigit + carry;
    //         const remainder = sum % 10;
    //         carry = (sum - remainder) / 10;
    //         digits.unshift(remainder);
    //     }
    //     if(carry > 0)
    //         digits.unshift(carry);

    //     return digits;

    // }

    // static subtractDigits(top: number[], bottom: number[]): number[] {

    //     while(top.length < bottom.length)
    //         top.unshift(0);
    //     while(bottom.length < top.length)
    //         bottom.unshift(0);

    //     let borrow = false;
    //     let digits: number[] = [];
    //     for(let position = top.length - 1; position >= 0; position--) {
    //         let topDigit = top[position];
    //         let bottomDigit = bottom[position];
    //         // Handle the previous loop's borrow.
    //         if(borrow) {
    //             // Propagate the borrow if this digit is zero.
    //             if(topDigit === 0) {
    //                 topDigit = 9;
    //                 borrow = true;
    //             }
    //             // If it's not, just decrease the top digit by one.
    //             else {
    //                 topDigit--;
    //                 borrow = false;
    //             }
    //         } 
    //         // If the top digit is still less than the bottom, borrow again and add 10.
    //         if(topDigit < bottomDigit) {
    //             topDigit += 10;
    //             borrow = true;
    //         }
    //         digits.unshift(topDigit - bottomDigit);
    //     }

    //     while(digits[0] === 0 && digits.length > 1) 
    //         digits.shift();
    //     return digits;

    // }

    negate(): Measurement {
        return new Measurement(-this.num, this.unit);
        // return new Measurement([!this.positive, this.digits, this.exponent, this.numerator, this.denominator ], this.unit);
    }

    absolute(): Measurement {
        return new Measurement(this.num.abs(), this.unit);
        // return new Measurement([true, this.digits, this.exponent, this.numerator, this.denominator ], this.unit);
    }

    add(operand: Measurement): Measurement {

        return new Measurement(this.num.add(operand.num), this.unit);

        // // If this is positive...
        // if(this.positive) {
        //     // And the operand is negative, subtract it's negation from this.
        //     if(!operand.positive)
        //         return this.subtract(operand.negate());
        // }
        // // If this is negative...
        // else {
        //     // ... but the operand is positive, negate this, subtract the operand from it, then negate the result
        //     if(operand.positive)
        //         return this.negate().subtract(operand).negate();
        // }
        // // Otherwise, if they have the same sign, we just add the digits and keep the sign.

        // // Align the exponents.
        // let [ thisDigits, thatDigits, newExponent ] = Measurement.align(this, operand);

        // // Add the digits.
        // const newDigits = Measurement.addDigits(thisDigits, thatDigits);

        // // While there are trailing zeroes, remove them, normalizing.
        // while(newDigits[newDigits.length - 1] === 0) {
        //     newDigits.pop();
        //     newExponent++;
        // }

        // // Add the ratios
        // // TODO

        // // Return modified ratios
        // return new Measurement([this.positive, newDigits, newExponent, this.numerator, this.denominator], this.unit);

    }

    // static align(left: Measurement, right: Measurement): [ number[], number[], number ] {

    //     // 1. Prepare some digits for adding. Copy them since we will mutate them.
    //     const leftDigits = left.digits.slice();
    //     const rightDigits = right.digits.slice();

    //     // 2. Which operand has the lower exponent?
    //     const leftExponentIsLower = left.exponent < right.exponent;
    //     const largerExponentsDigits = leftExponentIsLower ? rightDigits: leftDigits;
    //     let newExponent = leftExponentIsLower ? left.exponent : right.exponent;
    //     let exponentDifference = Math.abs(left.exponent - right.exponent);

    //     // 3. Pad the smaller digit's with zeroes on the right to align their exponents.
    //     while(exponentDifference > 0) {
    //         largerExponentsDigits.push(0);
    //         exponentDifference--;
    //     }

    //     return [ leftDigits, rightDigits, newExponent ];

    // }

    subtract(operand: Measurement): Measurement {

        return new Measurement(this.num.sub(operand.num), this.unit);

        // // The code below only knows how to subtract larger from smaller numbers, so we flip and negate in this case.
        // if(this.absolute().lessThan(operand.absolute()).bool)
        //     return operand.subtract(this).negate();

        // // Align the exponents
        // let [ thisDigits, thatDigits, newExponent ] = Measurement.align(this, operand);

        // // Now that the exponents are aligned, add the digits.
        // const newDigits = Measurement.subtractDigits(thisDigits, thatDigits);

        // // While there are trailing zeroes, remove them 
        // while(newDigits.length > 1 && newDigits[newDigits.length - 1] === 0) {
        //     newDigits.pop();
        //     newExponent++;
        // }
        
        // return new Measurement([ this.positive, newDigits, newExponent, this.numerator, this.denominator ], this.unit);

    }

    multiply(operand: Measurement): Measurement {

        // // Left pad with zeroes to match their lengths.
        // const left = this.digits.slice();
        // const right = operand.digits.slice();
        // while(left.length < right.length)
        //     left.unshift(0);
        // while(right.length < left.length)
        //     right.unshift(0);

        // // Create a bunch of digits for the product. We'll sum on this.
        // const product = [];
        // for(let i = 0; i < this.digits.length + operand.digits.length; i++)
        //     product.push(0);

        // // The algorithm below operates on rightmost digits at the beginning, so we reverse.
        // left.reverse();
        // right.reverse();

        // // Iterate from the rightmost digit to the left of the right digits
        // for(let r = 1; r <= right.length; r++) {
        //     let carry = 0;
        //     // Iterate from the rightmost digit of the left digits
        //     for(let l = 1; l <= left.length; l++) {
        //         const place = r + l - 1;
        //         product[place - 1] += carry + right[r - 1] * left[l - 1];
        //         carry = Math.floor(product[place - 1] / 10);
        //         product[place - 1] = product[place - 1] % 10;
        //     }
        //     product[r + left.length] = carry;
        // }

        // // Reverse to get the digits in order.
        // product.reverse();

        // // Remove preceding zeros
        // while(product.length > 1 && product[0] === 0)
        //     product.shift();

        // // Compute the exponent by suming them.
        // let newExponent = this.exponent + operand.exponent;

        // // While there are trailing zeroes, remove them 
        // while(product.length > 1 && product[product.length - 1] === 0) {
        //     product.pop();
        //     newExponent++;
        // }

        // return new Measurement([ this.positive === operand.positive, product, newExponent, this.numerator, this.denominator], 
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
            new None("nan") : 
            new Measurement(
                this.num.dividedBy(divisor.num), 
                new Unit(
                    this.unit.numerator.concat(divisor.unit.numerator),
                    this.unit.denominator.concat(divisor.unit.denominator)
                )
            );

        // // Divide by zero is undefined.
        // if(divisor.isZero()) return new None("nan");

        // // If divisor is negative, then negate the divisor, divide, then return the negation of the quotient.
        // if(!divisor.positive) {
        //     const result = this.divide(divisor.negate());
        //     if(result instanceof None) return result;
        //     const [ q, r ] = result;
        //     return [ q.negate(), r ];
        // }
        // // If the numerator is negative, then negate it and divide.
        // if(!this.positive) {
        //     const result = this.negate().divide(divisor);
        //     if(result instanceof None) return result;
        //     const [q, r] = result;
        //     if(r.isZero()) return [ q.negate(), new Measurement(0) ]
        //     else return [ q.negate().subtract(new Measurement(1)), divisor.subtract(r) ];
        // }

        // // If they're both positive, then divide unsigned to compute the quotient and remainder. 
        // let num: Measurement = this;
        // let div: Measurement = divisor;

        // // If the numerator has a negative exponent, pad it with zeros to convert it to an integer.
        // if(num.exponent < 0) num = num.multiply(new Measurement(Math.pow(10, Math.abs(num.exponent))));

        // // Use the (slow) repeeated subtraction method. We'll optmize later as necessary.
        // let q = new Measurement(0);
        // let r: Measurement = num;
        // while(r.greaterThan(div).bool || r.equals(div).bool) {
        //     q = q.add(new Measurement(1));
        //     r = r.subtract(div);
        // }

        // // Construct the new unit.
        // const newUnit = new Unit(
        //     this.unit.numerator.concat(divisor.unit.numerator),
        //     this.unit.denominator.concat(divisor.unit.denominator)
        // );

        // // Create a quotient from the result with the new exponent.
        // const quotient = new Measurement([ q.positive, q.digits, q.exponent, q.numerator, q.denominator], newUnit);

        // return [
        //     // quotient,
        //     // new Measurement([ r.positive, r.digits, r.exponent, r.numerator, r.denominator ], newUnit)
        // ];

    }

    remainder(divisor: Measurement): Measurement | None {

        return divisor.num.isZero() ? 
            new None("nan") : 
            new Measurement(
                this.num.modulo(divisor.num), 
                this.unit
            );

        // const result = this.divide(divisor);
        // return result instanceof None ? result : result[1];
    }

    /** Equal if all of their parts are equal. */
    equals(operand: Measurement): Bool {

        return new Bool(this.num === operand.num);
        
        // return new Bool(
        //     this.positive === operand.positive &&
        //     this.digits.join("") === operand.digits.join("") &&
        //     this.exponent === this.exponent &&
        //     this.numerator.join("") == operand.numerator.join("") &&
        //     this.denominator.join("") == operand.denominator.join("")
        // );
        
    }

    greaterThan(operand: Measurement): Bool {

        // Just reuse the less than code below by flipping the operands.
        return new Bool(this.num.greaterThan(operand.num));
        
    }

    lessThan(operand: Measurement): Bool {

        return new Bool(this.num.lessThan(operand.num));

        // If they have different signs, it's easy.
        // if(this.positive && !operand.positive) return new Bool(false);
        // if(!this.positive && operand.positive) return new Bool(true);

        // // If they share a sign, align the exponents to make digits comparable.
        // let [ thisDigits, thatDigits, newExponent ] = Measurement.align(this, operand);

        // // If they have different digit lengths, it's easy; account for signs by flipping the result if negative.
        // if(thisDigits.length < thatDigits.length) return new Bool(this.positive);
        // if(thisDigits.length > thatDigits.length) return new Bool(!this.positive);

        // // If they have the same number digits, compare the digits from most to least signficant.
        // for(let i = 0; i < thisDigits.length; i++) {
        //     if(thisDigits[i] < thatDigits[i]) return new Bool(this.positive);
        //     if(thisDigits[i] > thatDigits[i]) return new Bool(!this.positive);
        // }

        // // If they're equal, return false.
        // return new Bool(false);
        
    }

    // 182 -1 -> 182
    // 5 -5 -> 00005
    // 33 -5 -> 00033
    // 7 5 -> 700000
    // 1719 -3 -> 1719
    // 12 3 -> 12000
    // static padZeros(digits: number[], position: number) {
    //     digits = digits.slice();
    //     if(position < 0) {
    //         let count = -position - digits.length;
    //         while(count > 0) {
    //             digits.unshift(0);
    //             count--;
    //         }
    //     }
    //     else if(position > 0) {
    //         let count = position - digits.length + 1
    //         while(count > 0) {
    //             digits.push(0);
    //             count--;
    //         }
    //     }
    //     return digits;
    // }

    power(operand: Measurement) {

        return new Measurement(this.num.pow(operand.num), this.unit);

    }

    toString() { 
        return `${this.num.toString()}${this.unit.toString()}`;
        // // const digits = Measurement.padZeros(this.digits, this.exponent).join("");
        // // const before = digits.substring(0, this.digits.length + this.exponent);
        // // const after = digits.substring(this.digits.length + this.exponent);
        // // const ratio = (this.numerator.length === 0 || this.denominator.length === 0 ? "" : " " + this.numerator.join("") + "/" + this.denominator.join(""));
        // // const unit = this.unit.toString();
        // return `${this.positive ? "" : "-"}${before.length === 0 ? "0" : before}${after.length > 0 ? "." : ""}${after}${ratio}${unit}`;
    }

}