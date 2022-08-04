import { testConflict } from "../conflicts/testConflict";
import { UnknownConversion } from "../conflicts/UnknownConversion";
import Template from "./Template";

test("Test template conflicts", () => {

    testConflict('"Hello \\“hi”\\"', 'Cat: •() ()\n"Hello \\Cat()\\"', Template, UnknownConversion);
    
});