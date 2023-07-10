import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Update from '../nodes/Update';

export default class ExpectedUpdateBind extends Conflict {
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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Update.conflict.ExpectedUpdateBind,
                        new NodeLink(this.cell, locale, context)
                    ),
            },
        };
    }
}
