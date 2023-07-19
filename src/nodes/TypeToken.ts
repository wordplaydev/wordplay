import { TYPE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class TypeToken extends Token {
    constructor() {
        super(TYPE_SYMBOL, Symbol.Type);
    }
}
