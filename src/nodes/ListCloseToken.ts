import { LIST_CLOSE_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class ListCloseToken extends Token {
    constructor() {
        super(LIST_CLOSE_SYMBOL, Sym.ListClose);
    }
}
