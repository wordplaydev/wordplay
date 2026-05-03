import { TYPE_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class TypeToken extends Token {
    constructor() {
        super(TYPE_SYMBOL, Sym.Type);
    }
}
