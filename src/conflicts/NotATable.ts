import type Context from '../nodes/Context';
import type Delete from '../nodes/Delete';
import type Insert from '../nodes/Insert';
import type Select from '../nodes/Select';
import type Type from '../nodes/Type';
import type Update from '../nodes/Update';
import NodeLink from '../translations/NodeLink';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class NotATable extends Conflict {
    readonly op: Insert | Select | Delete | Update;
    readonly received: Type;

    constructor(op: Insert | Select | Delete | Update, received: Type) {
        super(false);

        this.op = op;
        this.received = received;
    }

    getConflictingNodes() {
        return { primary: this.op.table, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation, context: Context) {
        return translation.conflict.NotATable.primary(
            new NodeLink(this.received, translation, context)
        );
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
