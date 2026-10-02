import { SET_CLOSE_SYMBOL } from '#parser/Symbols.ts';
import { Sym } from '#nodes/Sym.ts';
import Token from '#nodes/Token.ts';

/** A token of this kind. A function rather than a subclass: every token is
 *  a plain Token, so a clone stays what it was constructed as. */
export default function SetCloseToken(): Token {
    return new Token(SET_CLOSE_SYMBOL, Sym.SetClose);
}
