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

    getConflictingNodes() {
        return {
            primary: {
                node: this.dis,
                explanation: (locales: Locales) =>
                    locales.concretize(
                        (l) => MisplacedThis.LocalePath(l).primary,
                    ),
            },
        };
    }

    getLocalePath() {
        return MisplacedThis.LocalePath;
    }
}
