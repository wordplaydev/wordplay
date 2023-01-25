import type Context from '@nodes/Context';
import type Delete from '@nodes/Delete';
import type Insert from '@nodes/Insert';
import type Select from '@nodes/Select';
import type Type from '@nodes/Type';
import type Update from '@nodes/Update';
import NodeLink from '@translation/NodeLink';
import type Translation from '@translation/Translation';
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
        return {
            primary: {
                node: this.op.table,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.NotATable.primary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
