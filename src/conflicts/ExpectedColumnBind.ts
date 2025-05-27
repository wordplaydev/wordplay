import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Locales from '../locale/Locales';
import type Update from '../nodes/Update';
import Conflict from './Conflict';

export default class ExpectedColumnBind extends Conflict {
    readonly update: Update;
    readonly cell: Expression;

    constructor(update: Update, cell: Expression) {
        super(false);
        this.update = update;
        this.cell = cell;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Update.conflict.ExpectedColumnBind;

    getConflictingNodes() {
        return {
            primary: {
                node: this.update,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ExpectedColumnBind.LocalePath(l).primary,
                        new NodeRef(this.cell, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return ExpectedColumnBind.LocalePath;
    }
}
