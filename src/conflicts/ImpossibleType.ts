import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Expression from '#nodes/Expression.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';
import BooleanLiteral from '#nodes/BooleanLiteral.ts';
import Is from '#nodes/Is.ts';
import Otherwise from '#nodes/Otherwise.ts';

export class ImpossibleType extends Conflict {
    readonly expression: Expression;
    readonly givenType: Type;

    constructor(expresion: Expression, givenType: Type) {
        super(ConflictSeverity.Minor);
        this.expression = expresion;
        this.givenType = givenType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Is.conflict.ImpossibleType;

    getMessage() {
        return {
            node: this.expression,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => ImpossibleType.LocalePath(l).explanation,
                    {
                        type: new NodeRef(this.givenType, locales, context),
                    },
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        // ImpossibleType fires from `Is` (the test is statically false) and
        // from `Otherwise` (the left can never be None, so `??` is dead). For
        // Is, replace with the constant `⊥`; for Otherwise, replace with the
        // left expression alone.
        if (this.expression instanceof Is) {
            const replacement = BooleanLiteral.make(false);
            return [
                {
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                ImpossibleType.LocalePath(l).resolutionIsFalse,
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [this.expression, replacement],
                        ]),
                        newNode: replacement,
                    }),
                },
            ];
        }
        if (this.expression instanceof Otherwise) {
            const replacement = this.expression.left;
            return [
                {
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                ImpossibleType.LocalePath(l)
                                    .resolutionDropOtherwise,
                        ),
                    mediator: (ctx) => ({
                        newProject: ctx.project.withRevisedNodes([
                            [this.expression, replacement],
                        ]),
                        newNode: replacement,
                    }),
                },
            ];
        }
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return ImpossibleType.LocalePath;
    }
}
