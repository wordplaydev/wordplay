import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class MissingShareLanguages extends Conflict {
    readonly share: Bind;

    constructor(share: Bind) {
        super(false);
        this.share = share;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.MissingShareLanguages;

    getMessage() {
        return {
            node: this.share,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MissingShareLanguages.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return MissingShareLanguages.LocalePath;
    }
}
