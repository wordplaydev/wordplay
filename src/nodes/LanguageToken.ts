import { LANGUAGE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class LanguageToken extends Token {
    constructor() {
        super(LANGUAGE_SYMBOL, Symbol.Language);
    }
}
