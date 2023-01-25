import { TYPE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import TokenType from './TokenType';

export default class TypeToken extends Token {
    constructor() {
        super(TYPE_SYMBOL, TokenType.TYPE);
    }
}
