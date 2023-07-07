import Conflict from './Conflict';
import type Bind from '@nodes/Bind';
import type Locale from '@locale/Locale';
import concretize from '../locale/locales/concretize';

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
                explanation: (locale: Locale) =>
                    concretize(locale, locale.conflict.InputListMustBeLast),
            },
        };
    }
}
