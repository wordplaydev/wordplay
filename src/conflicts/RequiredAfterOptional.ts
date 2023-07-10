import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type Locale from '@locale/Locale';
import concretize from '../locale/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(
                        locale,
                        locale.node.Bind.conflict.RequiredAfterOptional
                    ),
            },
        };
    }
}
