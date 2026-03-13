import { withoutVariationSelectors } from '@unicode/emoji';
import Sym from './Sym';
import Token from './Token';

export default class NameToken extends Token {
    constructor(name: string) {
        // Make sure the name being constructed doesn't have any variation selectors, as that
        // would prevent it from being matched on emojis that don't have variation selectors.
        super(withoutVariationSelectors(name), Sym.Name);
    }
}
