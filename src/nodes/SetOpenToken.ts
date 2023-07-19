import { SET_OPEN_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class SetOpenToken extends Token {
    constructor() {
        super(SET_OPEN_SYMBOL, Symbol.SetOpen);
    }
}
