import type This from '../nodes/This';
import type Translation from '../translations/Translation';
import Conflict from './Conflict';

export class MisplacedThis extends Conflict {
    readonly dis: This;
    constructor(dis: This) {
        super(false);
        this.dis = dis;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.dis,
                explanation: (translation: Translation) =>
                    translation.conflict.MisplacedThis.primary,
            },
        };
    }
}
