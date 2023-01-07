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
        return { primary: this.dis, secondary: [] };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.MisplacedThis.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
