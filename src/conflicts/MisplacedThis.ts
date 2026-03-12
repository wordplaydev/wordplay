import type LocaleText from '@locale/LocaleText';
import type This from '@nodes/This';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export class MisplacedThis extends Conflict {
    readonly dis: This;
    constructor(dis: This) {
        super(false);
        this.dis = dis;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.This.conflict.MisplacedThis;

    getMessage() {
        return {
            node: this.dis,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => MisplacedThis.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return MisplacedThis.LocalePath;
    }
}
