import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class InputListMustBeLast extends Conflict {
    readonly bind: Bind;

    constructor(rest: Bind) {
        super(false);

        this.bind = rest;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Evaluate.conflict.InputListMustBeLast;

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => InputListMustBeLast.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return InputListMustBeLast.LocalePath;
    }
}
