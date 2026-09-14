import { DOCS_SYMBOL } from '@parser/Symbols';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

/** A token of this kind. A function rather than a subclass: every token is
 *  a plain Token, so a clone stays what it was constructed as. */
export default function DocToken(docs = ''): Token {
    return new Token(`${DOCS_SYMBOL}${docs}${DOCS_SYMBOL}`, Sym.Doc);
}
