import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Reference from '@nodes/Reference';
import type Locales from '../locale/Locales';
import Conflict from './Conflict';

export default class ReferenceCycle extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(true);

        this.name = name;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reference.conflict.ReferenceCycle;

    getConflictingNodes() {
        return {
            primary: {
                node: this.name,
                explanation: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ReferenceCycle.LocalePath(l).primary,
                        new NodeRef(
                            this.name,
                            locales,
                            context,
                            this.name.getName(),
                        ),
                    ),
            },
        };
    }

    getLocalePath() {
        return ReferenceCycle.LocalePath;
    }
}
