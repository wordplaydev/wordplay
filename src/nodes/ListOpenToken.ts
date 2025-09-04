import { LIST_OPEN_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class ListOpenToken extends Token {
    constructor() {
        super(LIST_OPEN_SYMBOL, Sym.ListOpen);
    }
}
