import { PLACEHOLDER_SYMBOL } from '@parser/Symbols';
import Token from './Token';
import Symbol from './Symbol';

export default class PlaceholderToken extends Token {
    constructor() {
        super(PLACEHOLDER_SYMBOL, Symbol.Placeholder);
    }
}
