import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

export default class PlaceholderToken extends Token {
    constructor() {
        super(PLACEHOLDER_SYMBOL, Sym.Placeholder);
    }
}
