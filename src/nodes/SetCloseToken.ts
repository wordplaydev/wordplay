import { SET_CLOSE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class SetOpenToken extends Token {
    constructor() {
        super(SET_CLOSE_SYMBOL, Sym.SetClose);
    }
}
