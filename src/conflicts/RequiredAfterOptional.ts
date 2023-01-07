import Conflict from './Conflict';
import type Bind from '../nodes/Bind';
import type Translation from '../translations/Translation';

export default class RequiredAfterOptional extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(false);

        this.bind = bind;
    }

    getConflictingNodes() {
        return { primary: this.bind };
    }

    getPrimaryExplanation(translation: Translation) {
        return translation.conflict.RequiredAfterOptional.primary;
    }

    getSecondaryExplanation() {
        return undefined;
    }
}
