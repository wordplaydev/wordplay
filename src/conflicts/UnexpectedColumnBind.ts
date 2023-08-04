import type Context from '@nodes/Context';
import NodeRef from '@locale/NodeRef';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Bind from '../nodes/Bind';
import type TableLiteral from '../nodes/TableLiteral';

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
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Row.conflict.UnexpectedColumnBind.primary,
                        new NodeRef(this.cell, locale, context)
                    ),
            },
            secondary: {
                node: this.expression.type,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.node.Row.conflict.UnexpectedColumnBind.secondary,
                        new NodeRef(this.expression.type, locale, context)
                    ),
            },
        };
    }
}
