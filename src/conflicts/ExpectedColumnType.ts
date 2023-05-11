import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

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
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.ExpectedColumnType.primary(
                        new NodeLink(this.column, translation, context)
                    ),
            },
        };
    }
}
