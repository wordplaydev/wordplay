import { TYPE_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class TypeToken extends Token {
    constructor() {
        super(TYPE_SYMBOL, Sym.Type);
    }
}
