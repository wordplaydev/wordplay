import type LocaleText from '@locale/LocaleText';
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

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Row.conflict.UnexpectedColumnBind;

    getConflictingNodes() {
        return {
            primary: {
                node: this.expression,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnexpectedColumnBind.LocalePath(l).primary,

                        new NodeRef(this.cell, locales, context),
                    ),
            },
            secondary: {
                node: this.expression.type,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnexpectedColumnBind.LocalePath(l).secondary,
                        new NodeRef(this.expression.type, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnexpectedColumnBind.LocalePath;
    }
}
