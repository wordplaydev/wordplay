import { STREAM_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class SetOpenToken extends Token {
    constructor() {
        super(STREAM_SYMBOL, Sym.Stream);
    }
}
