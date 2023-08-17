import { LANGUAGE_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class LanguageToken extends Token {
    constructor() {
        super(LANGUAGE_SYMBOL, Sym.Language);
    }
}
