import { BIND_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class BindToken extends Token {
    constructor() {
        super(BIND_SYMBOL, Sym.Bind);
    }
}
