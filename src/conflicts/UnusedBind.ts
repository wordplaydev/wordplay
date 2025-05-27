import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Bind from '@nodes/Bind';
import type Context from '@nodes/Context';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class UnusedBind extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(true);

        this.bind = bind;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Bind.conflict.UnusedBind;

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind.names,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => UnusedBind.LocalePath(l).primary,
                        new NodeRef(this.bind.names, locales, context),
                    ),
            },
        };
    }

    getLocalePath() {
        return UnusedBind.LocalePath;
    }
}
