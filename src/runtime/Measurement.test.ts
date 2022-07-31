import Token, { TokenType } from "../nodes/Token";
import Measurement from "./Measurement";

test("Test number translation", () => {

    // Test JavaScript number translation.
    expect((new Measurement(18.2)).toString()).toBe("18.2");
    expect((new Measurement(-200302.123)).toString()).toBe("-200302.123");
    expect((new Measurement(0.000000001)).toString()).toBe("1e-9");

    // Test token number translation.
    expect((new Measurement(new Token("18.2", [ TokenType.DECIMAL ], 0))).toString()).toBe("18.2");
    expect((new Measurement(new Token("200302.123", [ TokenType.DECIMAL ], 0))).toString()).toBe("200302.123");
    expect((new Measurement(new Token("0.000000001", [ TokenType.DECIMAL ], 0))).toString()).toBe("1e-9");
    expect((new Measurement(new Token("001.100", [ TokenType.DECIMAL ], 0))).toString()).toBe("1.1");
    expect((new Measurement(new Token("1000", [ TokenType.DECIMAL ], 0))).toString()).toBe("1000");
    expect((new Measurement(new Token("∞", [ TokenType.INFINITY ], 0))).toString()).toBe("Infinity");

    // Test Japanese numbers.
    expect((new Measurement(new Token("十", [ TokenType.JAPANESE ]))).toString()).toBe("10");
    expect((new Measurement(new Token("二十", [ TokenType.JAPANESE ]))).toString()).toBe("20");
    expect((new Measurement(new Token("二十.二分", [ TokenType.JAPANESE ]))).toString()).toBe("20.2");
    expect((new Measurement(new Token("九万九千九百九十九.九分九厘九毛九糸九忽", [ TokenType.JAPANESE ]))).toString()).toBe("99999.99999");

    // Bases
    expect((new Measurement(new Token("2;10101.01", [ TokenType.BASE ], 0)).toString())).toBe("21.25");

})

test("Test inequalities", () => {

    expect((new Measurement(5)).lessThan(new Measurement(3)).bool).toBe(false);
    expect((new Measurement(5)).lessThan(new Measurement(10)).bool).toBe(true);
    expect((new Measurement(100.1)).lessThan(new Measurement(100.2)).bool).toBe(true);
    expect((new Measurement(100.1)).lessThan(new Measurement(100.2)).bool).toBe(true);
    expect((new Measurement(-1)).lessThan(new Measurement(-100)).bool).toBe(false);
    expect((new Measurement(-100)).lessThan(new Measurement(-1)).bool).toBe(true);
    expect((new Measurement(-1)).greaterThan(new Measurement(-100)).bool).toBe(true);
    expect((new Measurement(-100)).greaterThan(new Measurement(-1)).bool).toBe(false);

})

test("Test addition", () => {

    expect((new Measurement(1)).add(new Measurement(2)).toString()).toBe("3");
    expect((new Measurement(1)).add(new Measurement(10)).toString()).toBe("11");
    expect((new Measurement(-1)).add(new Measurement(-100)).toString()).toBe("-101");
    expect((new Measurement(1.1)).add(new Measurement(2.882)).toString()).toBe("3.982");
    expect((new Measurement(1.1)).add(new Measurement(2.982)).toNumber()).toBe(4.082);
    expect((new Measurement(-1.1)).add(new Measurement(2.982)).toString()).toBe("1.882");
    expect((new Measurement(2791)).add(new Measurement(-169.9)).toString()).toBe("2621.1");

})

test("Test subtraction", () => {

    expect((new Measurement(1)).subtract(new Measurement(2)).toString()).toBe("-1");
    expect((new Measurement(1)).subtract(new Measurement(10)).toString()).toBe("-9");
    expect((new Measurement(-1)).subtract(new Measurement(-100)).toString()).toBe("99");
    expect((new Measurement(1.1)).subtract(new Measurement(2.882)).toString()).toBe("-1.782");
    expect((new Measurement(1.1)).subtract(new Measurement(2.982)).toString()).toBe("-1.882");

})

test("Test multiplication", () => {

    expect((new Measurement(11)).multiply(new Measurement(12)).toString()).toBe("132");
    expect((new Measurement(-11)).multiply(new Measurement(12)).toString()).toBe("-132");
    expect((new Measurement(11)).multiply(new Measurement(-12)).toString()).toBe("-132");
    expect((new Measurement(.11)).multiply(new Measurement(-.12)).toString()).toBe("-0.0132");
    expect((new Measurement(1)).multiply(new Measurement(1)).toString()).toBe("1");
    expect((new Measurement(1)).multiply(new Measurement(0)).toString()).toBe("0");

})

test("Test division", () => {

    expect((new Measurement(1)).divide(new Measurement(1)).toString()).toBe("1");
    expect((new Measurement(0)).divide(new Measurement(1)).toString()).toBe("0");
    expect((new Measurement(1)).divide(new Measurement(0)).toString()).toBe("!nan");
    expect((new Measurement(10)).divide(new Measurement(5)).toString()).toBe("2");
    expect((new Measurement(-10)).divide(new Measurement(5)).toString()).toBe("-2");
    expect((new Measurement(1)).divide(new Measurement(3)).toString()).toBe("0.33333333333333333333");
    expect((new Measurement(1)).divide(new Measurement(2)).toString()).toBe("0.5");
    expect((new Measurement(11)).divide(new Measurement(2)).toString()).toBe("5.5");
    expect((new Measurement(0.11)).divide(new Measurement(2)).toString()).toBe("0.055");
    expect((new Measurement(2.1)).divide(new Measurement(.1)).toString()).toBe("21");
    expect((new Measurement(-2.1)).divide(new Measurement(.1)).toString()).toBe("-21");
    expect((new Measurement(2.1)).divide(new Measurement(-.1)).toString()).toBe("-21");

})
