import { STREAM_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import TokenType from './TokenType';

export default class SetOpenToken extends Token {
    constructor() {
        super(STREAM_SYMBOL, TokenType.Stream);
    }
}
