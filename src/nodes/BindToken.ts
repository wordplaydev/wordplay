import { BIND_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class BindToken extends Token {
    constructor() {
        super(BIND_SYMBOL, Sym.Bind);
    }
}
