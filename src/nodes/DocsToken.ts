import { DOCS_SYMBOL } from "../parser/Tokenizer";
import Token from "./Token";
import TokenType from "./TokenType";

export default class DocsToken extends Token {

    constructor(docs: string = "") {
        super(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, TokenType.DOCS);
    }
    
}