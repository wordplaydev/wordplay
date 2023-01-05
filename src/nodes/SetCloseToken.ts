import { SET_CLOSE_SYMBOL } from '../parser/Symbols';
import Token from './Token';
import TokenType from './TokenType';

export default class SetOpenToken extends Token {
    constructor() {
        super(SET_CLOSE_SYMBOL, TokenType.SET_CLOSE);
    }
}
