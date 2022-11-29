import Evaluator from "../runtime/Evaluator";
import { test, expect } from "vitest";

test("Test borrows", () => {

    expect(Evaluator.evaluateCode(`
        ↓ time
        time
    `)?.toString()).toBe("0ms");

    expect(Evaluator.evaluateCode(`
        ↓ sup1
        sup1
    `,
    [ `0` ]
    )?.toString()).toBe("0");

    expect(Evaluator.evaluateCode(`
        ↓ sup1
        sup1
    `,
    [ 
        `↓ time
         time` ]
    )?.toString()).toBe("0ms");

});