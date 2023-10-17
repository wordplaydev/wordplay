import type Context from '@nodes/Context';
import type Reference from '@nodes/Reference';
import NodeRef from '@locale/NodeRef';
import Conflict from './Conflict';
import concretize from '../locale/concretize';
import type Locales from '../locale/Locales';

export default class ReferenceCycle extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(true);

        this.name = name;
    }

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales, context: Context) =>
                    concretize(
                        locales,
                        locales.get(
                            (l) => l.node.Reference.conflict.ReferenceCycle
                        ),
                        new NodeRef(
                            this.name,
                            locales,
                            context,
                            this.name.getName()
                        )
                    ),
            },
        };
    }
}
