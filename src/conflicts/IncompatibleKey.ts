import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type SetOrMapAccess from '@nodes/SetOrMapAccess';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;

    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(false);
        this.access = access;
        this.expected = expected;
        this.received = received;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.SetOrMapAccess.conflict.IncompatibleKey;

    getMessage() {
        return {
            node: this.access,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => IncompatibleKey.LocalePath(l).explanation,
                    {
                        expected: new NodeRef(this.expected, locales, context),
                    },
                ),
        };
    }

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return IncompatibleKey.LocalePath;
    }
}
