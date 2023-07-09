import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

export default class ExpectedColumnType extends Conflict {
    readonly column: Bind;

    constructor(column: Bind) {
        super(false);
        this.column = column;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.column,
                explanation: (locale: Locale, context: Context) =>
                    concretize(
                        locale,
                        locale.conflict.ExpectedColumnType,
                        new NodeLink(this.column, locale, context)
                    ),
            },
        };
    }
}
