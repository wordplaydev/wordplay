import type Expression from '../nodes/Expression';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ExpectedUpdateBind extends Conflict {
    readonly cell: Expression;

    constructor(cell: Expression) {
        super(false);
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: this.cell, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.ExpectedUpdateBind.primary(this.cell);
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
