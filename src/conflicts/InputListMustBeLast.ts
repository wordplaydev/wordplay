import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

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
                explanation: (locales: Locales) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Evaluate.conflict.InputListMustBeLast
                        )
                    ),
            },
        };
    }
}
