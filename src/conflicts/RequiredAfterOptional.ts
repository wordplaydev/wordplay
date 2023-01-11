import Conflict from './Conflict';
import type Bind from '../nodes/Bind';
import type Translation from '../translation/Translation';

export default class RequiredAfterOptional extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(false);

        this.bind = bind;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (translation: Translation) =>
                    translation.conflict.RequiredAfterOptional.primary,
            },
        };
    }
}
