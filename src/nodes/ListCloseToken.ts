import { LIST_CLOSE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class ListCloseToken extends Token {
    constructor() {
        super(LIST_CLOSE_SYMBOL, Sym.ListClose);
    }
}
