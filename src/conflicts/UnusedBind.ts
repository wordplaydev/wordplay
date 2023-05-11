import type Bind from '@nodes/Bind';
import Conflict from './Conflict';
import type Locale from '@translation/Locale';

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
                explanation: (translation: Locale) =>
                    translation.conflict.UnusedBind.primary,
            },
        };
    }
}
