import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Token from '@nodes/Token';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnexpectedEtc extends Conflict {
    readonly etc: Token;
    readonly bind: Bind;
    constructor(etc: Token, bind: Bind) {
        super(false);
        this.etc = etc;
        this.bind = bind;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Bind.conflict.UnexpectedEtc;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedEtc.LocalePath(l).explanation,
                ),
        };
    }

    getLocalePath() {
        return UnexpectedEtc.LocalePath;
    }
}
