import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import Token from './Token';

export default class PlaceholderToken extends Token {
    constructor() {
        super(PLACEHOLDER_SYMBOL, Sym.Placeholder);
    }
}
