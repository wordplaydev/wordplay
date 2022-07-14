import { testConflict, UnknownConversion } from "../parser/Conflict";
import Template from "./Template";

test("Test template conflicts", () => {

    testConflict('"Hello (“hi”)"', 'Cat: •() ()\n"Hello (Cat())"', Template, UnknownConversion);
    
});