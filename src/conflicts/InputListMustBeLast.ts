import type Bind from '@nodes/Bind';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

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
                    locales.concretize(
                        (l) => l.node.Evaluate.conflict.InputListMustBeLast,
                    ),
            },
        };
    }
}
