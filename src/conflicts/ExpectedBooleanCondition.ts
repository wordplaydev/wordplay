import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import Conditional from '#nodes/Conditional.ts';
import type Context from '#nodes/Context.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import type Reaction from '#nodes/Reaction.ts';
import type Node from '#nodes/Node.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';

export default class ExpectedBooleanCondition extends Conflict {
    readonly conditional: Conditional | Reaction;
    readonly type: Type;

    constructor(conditional: Conditional | Reaction, type: Type) {
        super(ConflictSeverity.Error);

        this.conditional = conditional;
        this.type = type;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Conditional.conflict.ExpectedBooleanCondition;

    getMessage() {
        return {
            node:
                this.conditional instanceof Conditional
                    ? this.conditional.question
                    : this.conditional.dots,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => ExpectedBooleanCondition.LocalePath(l).explanation,
                    {
                        type: new NodeRef(this.type, locales, context),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return ExpectedBooleanCondition.LocalePath;
    }
}
