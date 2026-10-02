import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type SetOrMapAccess from '#nodes/SetOrMapAccess.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';

export class IncompatibleKey extends Conflict {
    readonly access: SetOrMapAccess;
    readonly expected: Type;
    readonly received: Type;

    constructor(access: SetOrMapAccess, expected: Type, received: Type) {
        super(ConflictSeverity.Error);
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
                        given: new NodeRef(this.received, locales, context),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return IncompatibleKey.LocalePath;
    }
}
