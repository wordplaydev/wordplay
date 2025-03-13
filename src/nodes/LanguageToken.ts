import { LANGUAGE_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class LanguageToken extends Token {
    constructor() {
        super(LANGUAGE_SYMBOL, Sym.Language);
    }
}
