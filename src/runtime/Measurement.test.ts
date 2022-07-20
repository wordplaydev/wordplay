import Token, { TokenType } from "../nodes/Token";
import Measurement from "./Measurement";

test("Parse number translation", () => {

    // Test JavaScript number translation.
    expect((new Measurement(18.2)).toString()).toBe("18.2");
    expect((new Measurement(-200302.123)).toString()).toBe("-200302.123");
    expect((new Measurement(0.000000001)).toString()).toBe("0.000000001");

    // Test token number translation.
    expect((new Measurement(new Token("18.2", [ TokenType.DECIMAL ], 0))).toString()).toBe("18.2");
    expect((new Measurement(new Token("200302.123", [ TokenType.DECIMAL ], 0))).toString()).toBe("200302.123");
    expect((new Measurement(new Token("0.000000001", [ TokenType.DECIMAL ], 0))).toString()).toBe("0.000000001");
    expect((new Measurement(new Token("001.100", [ TokenType.DECIMAL ], 0))).toString()).toBe("1.1");
    expect((new Measurement(new Token("1000", [ TokenType.DECIMAL ], 0))).toString()).toBe("1000");

})

test("Parse inequalities", () => {

    expect((new Measurement(5)).lessThan(new Measurement(3)).bool).toBe(false);
    expect((new Measurement(5)).lessThan(new Measurement(10)).bool).toBe(true);
    expect((new Measurement(100.1)).lessThan(new Measurement(100.2)).bool).toBe(true);
    expect((new Measurement(100.1)).lessThan(new Measurement(100.2)).bool).toBe(true);
    expect((new Measurement(-1)).lessThan(new Measurement(-100)).bool).toBe(false);
    expect((new Measurement(-100)).lessThan(new Measurement(-1)).bool).toBe(true);
    expect((new Measurement(-1)).greaterThan(new Measurement(-100)).bool).toBe(true);
    expect((new Measurement(-100)).greaterThan(new Measurement(-1)).bool).toBe(false);

})

test("Parse addition", () => {
    expect(Measurement.addDigits([ 1 ], [ 1 ]).join("")).toBe("2");
    expect(Measurement.addDigits([ 9 ], [ 6 ]).join("")).toBe("15");
    expect(Measurement.addDigits([ 1, 0, 0 ], [ 1 ]).join("")).toBe("101");
    expect(Measurement.addDigits([ 8, 0, 0 ], [ 9, 1, 3 ]).join("")).toBe("1713");
    expect(Measurement.addDigits([ 8 ], [ 1 ]).join("")).toBe("9");

    expect((new Measurement(1)).add(new Measurement(2)).toString()).toBe("3");
    expect((new Measurement(1)).add(new Measurement(10)).toString()).toBe("11");
    expect((new Measurement(-1)).add(new Measurement(-100)).toString()).toBe("-101");
    expect((new Measurement(1.1)).add(new Measurement(2.882)).toString()).toBe("3.982");
    expect((new Measurement(1.1)).add(new Measurement(2.982)).toString()).toBe("4.082");
    expect((new Measurement(-1.1)).add(new Measurement(2.982)).toString()).toBe("1.882");
    expect((new Measurement(2791)).add(new Measurement(-169.9)).toString()).toBe("2621.1");

})

test("Parse subtraction", () => {
    expect(Measurement.subtractDigits([ 1 ], [ 1 ]).join("")).toBe("0");
    expect(Measurement.subtractDigits([ 5 ], [ 1 ]).join("")).toBe("4");
    expect(Measurement.subtractDigits([ 1, 5 ], [ 1 ]).join("")).toBe("14");
    expect(Measurement.subtractDigits([ 1, 0 ], [ 1 ]).join("")).toBe("9");
    expect(Measurement.subtractDigits([ 1, 0, 0 ], [ 1 ]).join("")).toBe("99");
    expect(Measurement.subtractDigits([ 1, 0, 1, 0, 0 ], [ 1, 0, 1, 1 ]).join("")).toBe("9089");

    expect((new Measurement(1)).subtract(new Measurement(2)).toString()).toBe("-1");
    expect((new Measurement(1)).subtract(new Measurement(10)).toString()).toBe("-9");
    expect((new Measurement(-1)).subtract(new Measurement(-100)).toString()).toBe("99");
    expect((new Measurement(1.1)).subtract(new Measurement(2.882)).toString()).toBe("-1.782");
    expect((new Measurement(1.1)).subtract(new Measurement(2.982)).toString()).toBe("-1.882");

})

test("Parse multiplication", () => {

    expect((new Measurement(11)).multiply(new Measurement(12)).toString()).toBe("132");
    expect((new Measurement(-11)).multiply(new Measurement(12)).toString()).toBe("-132");
    expect((new Measurement(11)).multiply(new Measurement(-12)).toString()).toBe("-132");
    expect((new Measurement(.11)).multiply(new Measurement(-.12)).toString()).toBe("-0.0132");
    expect((new Measurement(1)).multiply(new Measurement(1)).toString()).toBe("1");
    expect((new Measurement(1)).multiply(new Measurement(0)).toString()).toBe("0");

})
