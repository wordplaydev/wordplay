import { STREAM_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class SetOpenToken extends Token {
    constructor() {
        super(STREAM_SYMBOL, Sym.Stream);
    }
}
