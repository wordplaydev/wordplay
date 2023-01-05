import type Bind from '../nodes/Bind';
import type Translation from '../translations/Translation';
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

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.ExpectedColumnType.primary(this.column);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
