import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class ExpectedSelectName extends Conflict {
    readonly cell: Expression;

    constructor(cell: Expression) {
        super(false);

        this.cell = cell;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.cell,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.ExpectedSelectName,
                        new NodeLink(this.cell, locale, context)
                    ),
            },
        };
    }
}
