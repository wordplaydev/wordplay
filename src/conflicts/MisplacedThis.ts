import type This from '@nodes/This';
import type Locale from '@translation/Locale';
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
                explanation: (translation: Locale) =>
                    translation.conflict.MisplacedThis.primary,
            },
        };
    }
}
