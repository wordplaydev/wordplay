import { testConflict, UnknownProperty } from "../parser/Conflict";
import AccessName from "./AccessName";

test("Test access name conflicts", () => {

    testConflict('Cat: •(name•"") ()\nboomy: Cat()\nboomy.name', 'a.b', AccessName, UnknownProperty);

});