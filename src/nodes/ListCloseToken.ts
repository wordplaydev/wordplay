import { LIST_CLOSE_SYMBOL } from '../parser/Tokenizer';
import Token from './Token';
import TokenType from './TokenType';

export default class ListCloseToken extends Token {
    constructor() {
        super(LIST_CLOSE_SYMBOL, TokenType.LIST_CLOSE);
    }
}
