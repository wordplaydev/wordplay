import type Context from '../nodes/Context';
import type Expression from '../nodes/Expression';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ExpectedUpdateBind extends Conflict {
    readonly cell: Expression;

    constructor(cell: Expression) {
        super(false);
        this.cell = cell;
    }

    getConflictingNodes() {
        return { primary: this.cell };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.ExpectedUpdateBind.primary(
            new NodeLink(this.cell, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
