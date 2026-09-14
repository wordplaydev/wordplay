import { withoutVariationSelectors } from '@unicode/emoji';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';

/** A token of this kind. A function rather than a subclass: every token is
 *  a plain Token, so a clone stays what it was constructed as. */
export default function NameToken(name: string): Token {
    // Make sure the name being constructed doesn't have any variation selectors, as that
    // would prevent it from being matched on emojis that don't have variation selectors.
    return new Token(withoutVariationSelectors(name), Sym.Name);
}
