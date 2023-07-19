import { STREAM_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class SetOpenToken extends Token {
    constructor() {
        super(STREAM_SYMBOL, Symbol.Stream);
    }
}
