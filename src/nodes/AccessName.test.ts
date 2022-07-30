import { testConflict, UnknownProperty } from "../parser/Conflict";
import Evaluator from "../runtime/Evaluator";
import AccessName from "./AccessName";
import Text from "../runtime/Text";

test("Test access name conflicts", () => {

    testConflict('•Cat(name•"") ()\nboomy: Cat()\nboomy.name', 'a.b', AccessName, UnknownProperty);

});

test("Test access evaluate", () => {

    expect(Evaluator.evaluateCode("•Cat(name•'') ()\nCat('boomy').name")).toBeInstanceOf(Text);

});