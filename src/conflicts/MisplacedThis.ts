import type This from '../nodes/This';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import { THIS_SYMBOL } from '../parser/Tokenizer';
import Conflict from './Conflict';

export class MisplacedThis extends Conflict {
    readonly dis: This;
    constructor(dis: This) {
        super(false);
        this.dis = dis;
    }

    getConflictingNodes() {
        return { primary: this.dis, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng: `Can only use ${THIS_SYMBOL} inside a structure definition or reaction.`,
        };
    }
}
