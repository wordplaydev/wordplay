import type Bind from '../nodes/Bind';
import Conflict from './Conflict';
import type Translation from '../translation/Translation';

export default class UnusedBind extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);

        this.bind = bind;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind.names,
                explanation: (translation: Translation) =>
                    translation.conflict.UnusedBind.primary,
            },
        };
    }
}
