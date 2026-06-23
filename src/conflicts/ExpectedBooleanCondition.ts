import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import Conditional from '@nodes/Conditional';
import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import type Reaction from '@nodes/Reaction';
import type Node from '@nodes/Node';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';

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
