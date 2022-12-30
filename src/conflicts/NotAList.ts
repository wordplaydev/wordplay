import type Context from '../nodes/Context';
import type ListAccess from '../nodes/ListAccess';
import type Translations from '../nodes/Translations';
import { TRANSLATE } from '../nodes/Translations';
import type Type from '../nodes/Type';
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
        return { primary: this.access.list, secondary: [] };
    }

    getPrimaryExplanation(context: Context): Translations {
        return {
            '😀': TRANSLATE,
            eng: `This isn't a list, it's ${
                this.received.getDescriptions(context).eng
            }.`,
        };
    }
}
