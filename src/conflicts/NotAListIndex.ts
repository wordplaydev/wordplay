import type Context from '@nodes/Context';
import type ListAccess from '@nodes/ListAccess';
import type Type from '@nodes/Type';
import NodeLink from '@translation/NodeLink';
import type Translation from '@translation/Translation';
import Conflict from './Conflict';

export class NotAListIndex extends Conflict {
    readonly access: ListAccess;
    readonly indexType: Type;

    constructor(access: ListAccess, indexType: Type) {
        super(false);

        this.access = access;
        this.indexType = indexType;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.access.index,
                explanation: (translation: Translation, context: Context) =>
                    translation.conflict.NotAListIndex.primary(
                        new NodeLink(this.indexType, translation, context)
                    ),
            },
        };
    }
}
