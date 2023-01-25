import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type Translation from '@translation/Translation';

export default class InputListMustBeLast extends Conflict {
    readonly bind: Bind;

    constructor(rest: Bind) {
        super(false);

        this.bind = rest;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (translation: Translation) =>
                    translation.conflict.InputListMustBeLast.primary,
            },
        };
    }
}
