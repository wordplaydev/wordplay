import type Context from '@nodes/Context';
import type ListAccess from '@nodes/ListAccess';
import type Type from '@nodes/Type';
import NodeLink from '@locale/NodeLink';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';

export class NotAList extends Conflict {
    readonly access: ListAccess;
    readonly received: Type;

    constructor(access: ListAccess, received: Type) {
        super(false);

        this.access = access;
        this.received = received;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.access.list,
                explanation: (translation: Locale, context: Context) =>
                    translation.conflict.NotAList.primary(
                        new NodeLink(this.received, translation, context)
                    ),
            },
        };
    }
}
