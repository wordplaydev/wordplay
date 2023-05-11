import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type Locale from '@locale/Locale';

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
                explanation: (translation: Locale) =>
                    translation.conflict.RequiredAfterOptional.primary,
            },
        };
    }
}
