import { SET_CLOSE_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class SetOpenToken extends Token {
    constructor() {
        super(SET_CLOSE_SYMBOL, Sym.SetClose);
    }
}
