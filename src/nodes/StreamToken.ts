import { STREAM_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Symbol';

export default class SetOpenToken extends Token {
    constructor() {
        super(STREAM_SYMBOL, Sym.Stream);
    }
}
