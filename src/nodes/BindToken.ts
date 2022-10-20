import { BIND_SYMBOL } from "../parser/Tokenizer";
import Token from "./Token";
import TokenType from "./TokenType";

export default class BindToken extends Token {

    constructor() {
        super(BIND_SYMBOL, TokenType.BIND);
    }
    
}