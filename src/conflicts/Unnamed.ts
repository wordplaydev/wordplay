import type Name from '../nodes/Name';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export default class Unnamed extends Conflict {
    readonly alias: Name;
    constructor(alias: Name) {
        super(true);
        this.alias = alias;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.alias,
                explanation: (translation: Translation) =>
                    translation.conflict.Unnamed.primary,
            },
        };
    }
}
