import type Bind from '../nodes/Bind';
import Conflict from './Conflict';
import type Translation from '../translations/Translation';

export default class UnusedBind extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);

        this.bind = bind;
    }

    getConflictingNodes() {
        return { primary: this.bind.names };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.UnusedBind.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
