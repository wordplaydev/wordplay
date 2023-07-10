import type Bind from '@nodes/Bind';
import type Locale from '@locale/Locale';
import Conflict from './Conflict';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.MissingShareLanguages
                    ),
            },
        };
    }
}
