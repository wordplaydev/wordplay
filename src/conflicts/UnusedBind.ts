import type Bind from '@nodes/Bind';
import Conflict from './Conflict';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

export default class UnusedBind extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);

        this.bind = bind;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locale: Locale) =>
                    concretize(locale, locale.node.Bind.conflict.UnusedBind),
            },
        };
    }
}
