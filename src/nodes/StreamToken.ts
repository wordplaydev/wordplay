import { STREAM_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class SetOpenToken extends Token {
    constructor() {
        super(STREAM_SYMBOL, Sym.Stream);
    }
}
