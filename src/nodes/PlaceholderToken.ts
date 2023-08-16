import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Sym from './Sym';

export default class PlaceholderToken extends Token {
    constructor() {
        super(PLACEHOLDER_SYMBOL, Sym.Placeholder);
    }
}
