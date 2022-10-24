import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import Token from "./Token";
import TokenType from "./TokenType";

export default class PlaceholderToken extends Token {

    constructor() {
        super(PLACEHOLDER_SYMBOL, TokenType.PLACEHOLDER);
    }

}
