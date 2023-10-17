import type Bind from '@nodes/Bind';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get((l) => l.node.Bind.conflict.UnusedBind)
                    ),
            },
        };
    }
}
