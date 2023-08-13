import { LIST_OPEN_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class ListOpenToken extends Token {
    constructor() {
        super(LIST_OPEN_SYMBOL, Sym.ListOpen);
    }
}
