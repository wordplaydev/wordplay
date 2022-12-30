import type Bind from '../nodes/Bind';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import Conflict from './Conflict';

export default class ExpectedColumnType extends Conflict {
    readonly column: Bind;

    constructor(column: Bind) {
        super(false);
        this.column = column;
    }

    getConflictingNodes() {
        return { primary: this.column, secondary: [] };
    }

    getPrimaryExplanation(): Translations {
        return {
            eng: `Table columns have to have a type.`,
            '😀': TRANSLATE,
        };
    }
}
