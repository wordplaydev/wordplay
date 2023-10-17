import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Update from '../nodes/Update';
import type Locales from '../locale/Locales';

export default class ExpectedColumnBind extends Conflict {
    readonly update: Update;
    readonly cell: Expression;

    constructor(update: Update, cell: Expression) {
        super(false);
        this.update = update;
        this.cell = cell;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.update,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Update.conflict.ExpectedColumnBind
                        ),
                        new NodeRef(this.cell, locales, context)
                    ),
            },
        };
    }
}
