import { TYPE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class TypeToken extends Token {
    constructor() {
        super(TYPE_SYMBOL, Sym.Type);
    }
}
