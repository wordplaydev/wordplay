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

    getConflictingNodes() {
        return {
            primary: {
                node: this.bind.names,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => l.node.Bind.conflict.UnusedBind,
                        new NodeRef(this.bind.names, locales, context),
                    ),
            },
        };
    }
}
