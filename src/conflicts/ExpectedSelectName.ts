import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import NodeLink from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Select from '../nodes/Select';

export default class ExpectedSelectName extends Conflict {
    readonly select: Select;
    readonly cell: Expression;

    constructor(select: Select, cell: Expression) {
        super(false);

        this.select = select;
        this.cell = cell;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.select,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Select.conflict.ExpectedSelectName,
                        new NodeLink(this.cell, locale, context)
                    ),
            },
        };
    }
}
