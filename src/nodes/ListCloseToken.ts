import { LIST_CLOSE_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class ListCloseToken extends Token {
    constructor() {
        super(LIST_CLOSE_SYMBOL, Sym.ListClose);
    }
}
