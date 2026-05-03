import { LANGUAGE_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class LanguageToken extends Token {
    constructor() {
        super(LANGUAGE_SYMBOL, Sym.Language);
    }
}
