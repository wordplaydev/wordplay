import { PLACEHOLDER_SYMBOL } from '#parser/Symbols.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';

/** A token of this kind. A function rather than a subclass: every token is
 *  a plain Token, so a clone stays what it was constructed as. */
export default function PlaceholderToken(): Token {
    return new Token(PLACEHOLDER_SYMBOL, Sym.Placeholder);
}
