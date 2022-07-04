import { tokenize} from "./Parser";

describe("Check the tokenizer", () => {
    test("Tokenizer", () => {

        expect(tokenize("hello").join("")).toBe("hello");

    })

})