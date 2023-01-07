import type Bind from '../nodes/Bind';
import type Context from '../nodes/Context';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class ExpectedColumnType extends Conflict {
    readonly column: Bind;

    constructor(column: Bind) {
        super(false);
        this.column = column;
    }

    getConflictingNodes() {
        return { primary: this.column };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.ExpectedColumnType.primary(
            new NodeLink(this.column, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
