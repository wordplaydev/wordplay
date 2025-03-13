import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Locales from '../locale/Locales';
import type Bind from '../nodes/Bind';
import type TableLiteral from '../nodes/TableLiteral';
import Conflict from './Conflict';

export default class UnexpectedColumnBind extends Conflict {
    readonly expression: TableLiteral;
    readonly cell: Bind;

    constructor(literal: TableLiteral, cell: Bind) {
        super(false);
        this.expression = literal;
        this.cell = cell;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.expression,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Row.conflict.UnexpectedColumnBind.primary,

                        new NodeRef(this.cell, locales, context),
                    ),
            },
            secondary: {
                node: this.expression.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) =>
                            l.node.Row.conflict.UnexpectedColumnBind.secondary,
                        new NodeRef(this.expression.type, locales, context),
                    ),
            },
        };
    }
}
