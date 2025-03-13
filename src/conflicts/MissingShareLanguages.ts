import type Bind from '@nodes/Bind';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class MissingShareLanguages extends Conflict {
    readonly share: Bind;

    constructor(share: Bind) {
        super(false);
        this.share = share;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.share,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => l.node.Bind.conflict.MissingShareLanguages,
                    ),
            },
        };
    }
}
