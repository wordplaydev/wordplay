import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Select from '../nodes/Select';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Select.conflict.ExpectedSelectName
                        ),
                        new NodeRef(this.cell, locales, context)
                    ),
            },
        };
    }
}
