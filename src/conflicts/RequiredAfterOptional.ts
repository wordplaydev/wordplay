import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Bind.conflict.RequiredAfterOptional,
                    ),
            },
        };
    }
}
