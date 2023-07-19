import { BIND_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class BindToken extends Token {
    constructor() {
        super(BIND_SYMBOL, Symbol.Bind);
    }
}
