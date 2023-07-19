import { SET_CLOSE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class SetOpenToken extends Token {
    constructor() {
        super(SET_CLOSE_SYMBOL, Symbol.SetClose);
    }
}
