import Conflict from './Conflict';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import UnparsableType from '../nodes/UnparsableType';
import type UnparsableExpression from '../nodes/UnparsableExpression';

export class UnparsableConflict extends Conflict {
    readonly unparsable: UnparsableType | UnparsableExpression;

    constructor(unparsable: UnparsableType | UnparsableExpression) {
        super(false);
        this.unparsable = unparsable;
    }

    getConflictingNodes() {
        return { primary: this.unparsable, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            '😀': TRANSLATE,
            eng:
                this.unparsable instanceof UnparsableType
                    ? `We expected this to be a type, but we couldn't figure out what kind you meant.`
                    : `We expected this to be an expression, but we couldn't find out what kind you meant.`,
        };
    }
}
