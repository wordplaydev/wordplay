import { DuplicateLanguages, ExpectedEndingExpression, IgnoredExpression, testConflict } from "../parser/Conflict";
import Block from "./Block";

test("Test block conflicts", () => {

    testConflict('1', '', Block, ExpectedEndingExpression);
    testConflict('`hi`eng`hola`spa\n"hi"', '`hi`eng`hola`eng\n"hi"', Block, DuplicateLanguages);
    testConflict('1+1', '1+1\n2+2', Block, IgnoredExpression);

});