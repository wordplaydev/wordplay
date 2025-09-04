import { BIND_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class BindToken extends Token {
    constructor() {
        super(BIND_SYMBOL, Sym.Bind);
    }
}
