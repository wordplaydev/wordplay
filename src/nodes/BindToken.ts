import { BIND_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class BindToken extends Token {
    constructor() {
        super(BIND_SYMBOL, Sym.Bind);
    }
}
