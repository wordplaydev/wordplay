import { test, expect } from "vitest";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import { FALSE_SYMBOL, TRUE_SYMBOL } from "../parser/Tokenizer";
import Evaluator from "./Evaluator";
import Measurement from "./Measurement";
import TypeException from "./TypeException";

/** This is just a placeholder to represent the node creating all of the values below. */
const literal = new MeasurementLiteral();

test("Test number translation", () => {

    // Test JavaScript number translation.
    expect((new Measurement(literal, 18.2)).toString()).toBe("18.2");
    expect((new Measurement(literal, -200302.123)).toString()).toBe("-200302.123");
    expect((new Measurement(literal, 0.000000001)).toString()).toBe("1e-9");

    // Test token number translation.
    expect((new Measurement(literal, new Token("18.2", TokenType.DECIMAL))).toString()).toBe("18.2");
    expect((new Measurement(literal, new Token("200302.123", TokenType.DECIMAL))).toString()).toBe("200302.123");
    expect((new Measurement(literal, new Token("0.000000001", TokenType.DECIMAL))).toString()).toBe("1e-9");
    expect((new Measurement(literal, new Token("001.100", TokenType.DECIMAL))).toString()).toBe("1.1");
    expect((new Measurement(literal, new Token("1000", TokenType.DECIMAL))).toString()).toBe("1000");
    expect((new Measurement(literal, new Token("∞", TokenType.INFINITY))).toString()).toBe("Infinity");

    // Test Japanese numbers.
    expect((new Measurement(literal, new Token("十", TokenType.JAPANESE))).toString()).toBe("10");
    expect((new Measurement(literal, new Token("二十", TokenType.JAPANESE))).toString()).toBe("20");
    expect((new Measurement(literal, new Token("二万", TokenType.JAPANESE))).toString()).toBe("20000");
    expect((new Measurement(literal, new Token("二十・二分", TokenType.JAPANESE))).toString()).toBe("20.2");
    expect((new Measurement(literal, new Token("九万九千九百九十九・九分九厘九毛九糸九忽", TokenType.JAPANESE))).toString()).toBe("99999.99999");
    expect((new Measurement(literal, new Token("99万", TokenType.JAPANESE))).toString()).toBe("990000");

    // Test roman numerals.
    expect((new Measurement(literal, new Token("Ⅹ", TokenType.ROMAN))).toString()).toBe("10");
    expect((new Measurement(literal, new Token("ⅩⅩ", TokenType.ROMAN))).toString()).toBe("20");
    expect((new Measurement(literal, new Token("ⅩⅩⅩⅠⅩ", TokenType.ROMAN))).toString()).toBe("39");
    expect((new Measurement(literal, new Token("ⅭⅭⅩⅬⅤⅠ", TokenType.ROMAN))).toString()).toBe("246");
    expect((new Measurement(literal, new Token("ⅮⅭⅭⅬⅩⅩⅩⅠⅩ", TokenType.ROMAN))).toString()).toBe("789");
    expect((new Measurement(literal, new Token("ⅯⅯⅭⅮⅩⅩⅠ", TokenType.ROMAN))).toString()).toBe("2421");

    // Bases
    expect((new Measurement(literal, new Token("2;10101.01", TokenType.BASE)).toString())).toBe("21.25");

})

test("Test equalities and inequalities", () => {

    expect(Evaluator.evaluateCode(`1 = 1`)?.toString()).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode(`1 = 2`)?.toString()).toBe(FALSE_SYMBOL);
    expect(Evaluator.evaluateCode(`1m = 1m`)?.toString()).toBe(TRUE_SYMBOL);
    expect(Evaluator.evaluateCode(`1m = 1`)).toBeInstanceOf(TypeException);
    expect(Evaluator.evaluateCode(`1 = !`)).toBeInstanceOf(TypeException);

    expect((new Measurement(literal, 5)).lessThan(literal, new Measurement(literal, 3)).bool).toBe(false);
    expect((new Measurement(literal, 5)).lessThan(literal, new Measurement(literal, 10)).bool).toBe(true);
    expect((new Measurement(literal, 100.1)).lessThan(literal, new Measurement(literal, 100.2)).bool).toBe(true);
    expect((new Measurement(literal, 100.1)).lessThan(literal, new Measurement(literal, 100.2)).bool).toBe(true);
    expect((new Measurement(literal, -1)).lessThan(literal, new Measurement(literal, -100)).bool).toBe(false);
    expect((new Measurement(literal, -100)).lessThan(literal, new Measurement(literal, -1)).bool).toBe(true);
    expect((new Measurement(literal, -1)).greaterThan(literal, new Measurement(literal, -100)).bool).toBe(true);
    expect((new Measurement(literal, -100)).greaterThan(literal, new Measurement(literal, -1)).bool).toBe(false);

})

test("Test addition", () => {

    expect((new Measurement(literal, 1)).add(literal, new Measurement(literal, 2)).toString()).toBe("3");
    expect((new Measurement(literal, 1)).add(literal, new Measurement(literal, 10)).toString()).toBe("11");
    expect((new Measurement(literal, -1)).add(literal, new Measurement(literal, -100)).toString()).toBe("-101");
    expect((new Measurement(literal, 1.1)).add(literal, new Measurement(literal, 2.882)).toString()).toBe("3.982");
    expect((new Measurement(literal, 1.1)).add(literal, new Measurement(literal, 2.982)).toNumber()).toBe(4.082);
    expect((new Measurement(literal, -1.1)).add(literal, new Measurement(literal, 2.982)).toString()).toBe("1.882");
    expect((new Measurement(literal, 2791)).add(literal, new Measurement(literal, -169.9)).toString()).toBe("2621.1");

})

test("Test subtraction", () => {

    expect((new Measurement(literal, 1)).subtract(literal, new Measurement(literal, 2)).toString()).toBe("-1");
    expect((new Measurement(literal, 1)).subtract(literal, new Measurement(literal, 10)).toString()).toBe("-9");
    expect((new Measurement(literal, -1)).subtract(literal, new Measurement(literal, -100)).toString()).toBe("99");
    expect((new Measurement(literal, 1.1)).subtract(literal, new Measurement(literal, 2.882)).toString()).toBe("-1.782");
    expect((new Measurement(literal, 1.1)).subtract(literal, new Measurement(literal, 2.982)).toString()).toBe("-1.882");

})

test("Test multiplication", () => {

    expect((new Measurement(literal, 11)).multiply(literal, new Measurement(literal, 12)).toString()).toBe("132");
    expect((new Measurement(literal, -11)).multiply(literal, new Measurement(literal, 12)).toString()).toBe("-132");
    expect((new Measurement(literal, 11)).multiply(literal, new Measurement(literal, -12)).toString()).toBe("-132");
    expect((new Measurement(literal, .11)).multiply(literal, new Measurement(literal, -.12)).toString()).toBe("-0.0132");
    expect((new Measurement(literal, 1)).multiply(literal, new Measurement(literal, 1)).toString()).toBe("1");
    expect((new Measurement(literal, 1)).multiply(literal, new Measurement(literal, 0)).toString()).toBe("0");

})

test("Test division", () => {

    expect((new Measurement(literal, 1)).divide(literal, new Measurement(literal, 1)).toString()).toBe("1");
    expect((new Measurement(literal, 0)).divide(literal, new Measurement(literal, 1)).toString()).toBe("0");
    expect((new Measurement(literal, 1)).divide(literal, new Measurement(literal, 0)).toString()).toBe("!nan");
    expect((new Measurement(literal, 10)).divide(literal, new Measurement(literal, 5)).toString()).toBe("2");
    expect((new Measurement(literal, -10)).divide(literal, new Measurement(literal, 5)).toString()).toBe("-2");
    expect((new Measurement(literal, 1)).divide(literal, new Measurement(literal, 3)).toString()).toBe("0.33333333333333333333");
    expect((new Measurement(literal, 1)).divide(literal, new Measurement(literal, 2)).toString()).toBe("0.5");
    expect((new Measurement(literal, 11)).divide(literal, new Measurement(literal, 2)).toString()).toBe("5.5");
    expect((new Measurement(literal, 0.11)).divide(literal, new Measurement(literal, 2)).toString()).toBe("0.055");
    expect((new Measurement(literal, 2.1)).divide(literal, new Measurement(literal, .1)).toString()).toBe("21");
    expect((new Measurement(literal, -2.1)).divide(literal, new Measurement(literal, .1)).toString()).toBe("-21");
    expect((new Measurement(literal, 2.1)).divide(literal, new Measurement(literal, -.1)).toString()).toBe("-21");

})

test("Test roots and powers", () => {

    expect(Evaluator.evaluateCode("1 √ 2")?.toString()).toBe("1");
    expect(Evaluator.evaluateCode("4 √ 2")?.toString()).toBe("2");
    expect(Evaluator.evaluateCode("4m √ 2")?.toString()).toBe("2/m");
    expect(Evaluator.evaluateCode("4m^2 √ 2")?.toString()).toBe("2m");
    expect(Evaluator.evaluateCode("4m^m/s √ 2")?.toString()).toBe("2m/s^2");

    expect(Evaluator.evaluateCode("2 ^ 8")?.toString()).toBe("256");
    expect(Evaluator.evaluateCode("2m ^ 2")?.toString()).toBe("4m^2");
    expect(Evaluator.evaluateCode("2m/s ^ 2")?.toString()).toBe("4m^2/s^2");
 
});

test("Test conversions", () => {

    // TEXT
    expect(Evaluator.evaluateCode("1→''")?.toString()).toBe('"1"');
    // Numbers to text should be arabic by default
    expect(Evaluator.evaluateCode("1→''")?.toString()).toBe('"1"');
    // Text to numbers assume arabic by default
    expect(Evaluator.evaluateCode("'1'→#")?.toString()).toBe('1');
    // Non-numbers should be !nan
    expect(Evaluator.evaluateCode("'1.1.1'→#")?.toString()).toBe('NaN');

    // PERCENT
    expect(Evaluator.evaluateCode("1%")?.toString()).toBe('0.01');

    // TIME
    // No change if matching type.
    expect(Evaluator.evaluateCode("1s→#s")?.toString()).toBe('1s');
    // Seconds/minutes
    expect(Evaluator.evaluateCode("60s→#min")?.toString()).toBe('1min');
    expect(Evaluator.evaluateCode("1min→#s")?.toString()).toBe('60s');
    // Seconds/hours
    expect(Evaluator.evaluateCode("3600s→#h")?.toString()).toBe('1h');
    expect(Evaluator.evaluateCode("1h→#s")?.toString()).toBe('3600s');
    // Seconds/days
    expect(Evaluator.evaluateCode("86400s→#day")?.toString()).toBe('1day');
    expect(Evaluator.evaluateCode("1day→#s")?.toString()).toBe('86400s');
    // Minutes/hours
    expect(Evaluator.evaluateCode("60min→#h")?.toString()).toBe('1h');
    expect(Evaluator.evaluateCode("1h→#min")?.toString()).toBe('60min');
    // Minutes/days
    expect(Evaluator.evaluateCode("1440min→#day")?.toString()).toBe('1day');
    expect(Evaluator.evaluateCode("1day→#min")?.toString()).toBe('1440min');
    // Hours/days
    expect(Evaluator.evaluateCode("24h→#day")?.toString()).toBe('1day');
    expect(Evaluator.evaluateCode("1day→#h")?.toString()).toBe('24h');
    // Days/weeks
    expect(Evaluator.evaluateCode("1wk→#day")?.toString()).toBe('7day');
    expect(Evaluator.evaluateCode("14day→#wk")?.toString()).toBe('2wk');

    // DISTANCE
    // Direct conversions
    expect(Evaluator.evaluateCode("1m→#pm")?.toString()).toBe('1000000000000pm');
    expect(Evaluator.evaluateCode("1m→#nm")?.toString()).toBe('1000000000nm');
    expect(Evaluator.evaluateCode("1m→#µm")?.toString()).toBe('1000000µm');
    expect(Evaluator.evaluateCode("1m→#mm")?.toString()).toBe('1000mm');
    expect(Evaluator.evaluateCode("1m→#cm")?.toString()).toBe('100cm');
    expect(Evaluator.evaluateCode("1m→#dm")?.toString()).toBe('10dm');
    expect(Evaluator.evaluateCode("1m→#km")?.toString()).toBe('0.001km');
    expect(Evaluator.evaluateCode("1m→#Mm")?.toString()).toBe('0.000001Mm');
    expect(Evaluator.evaluateCode("1m→#Gm")?.toString()).toBe('1e-9Gm');
    expect(Evaluator.evaluateCode("1m→#Tm")?.toString()).toBe('1e-12Tm');

    // Transitive conversions
    expect(Evaluator.evaluateCode("1km→#cm")?.toString()).toBe('100000cm');

    // WEIGHT
    expect(Evaluator.evaluateCode("1kg→#oz")?.toString()).toBe('35.274oz');
    expect(Evaluator.evaluateCode("1kg→#oz")?.toString()).toBe('35.274oz');
    expect(Evaluator.evaluateCode("1000mg→#lb")?.toString()).toBe('0.002204625lb');

    // WEIGHT


})