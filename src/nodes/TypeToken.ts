import { TYPE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class TypeToken extends Token {
    constructor() {
        super(TYPE_SYMBOL, Sym.Type);
    }
}
