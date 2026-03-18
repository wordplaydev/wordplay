import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class RequiredAfterOptional extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(false);

        this.bind = bind;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.RequiredAfterOptional;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => RequiredAfterOptional.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return RequiredAfterOptional.LocalePath;
    }
}
