import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Expression from '#nodes/Expression.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import type Node from '#nodes/Node.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import findDivideByZeroSource from '#conflicts/findDivideByZeroSource.ts';

export default class IncompatibleType extends Conflict {
    readonly receiver: Node;
    readonly expectedType: Type;
    readonly expression: Expression;
    readonly givenType: Type;

    constructor(
        receiver: Node,
        expectedType: Type,
        expression: Expression,
        givenType: Type,
    ) {
        super(ConflictSeverity.Error);

        this.receiver = receiver;
        this.expectedType = expectedType;
        this.expression = expression;
        this.givenType = givenType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Bind.conflict.IncompatibleType;

    getMessage() {
        return {
            node: this.receiver,
            explanation: (locales: Locales, context: Context) => {
                // If the incompatible ø traces to a possible divide-by-zero,
                // explain that specifically instead of a generic type mismatch.
                const source = findDivideByZeroSource(this.expression, context);
                if (source !== undefined)
                    return locales.concretize(
                        (l) =>
                            IncompatibleType.LocalePath(l)
                                .explanationDivideByZero,
                        { source: new NodeRef(source, locales, context) },
                    );
                return locales.concretize(
                    (l) => IncompatibleType.LocalePath(l).explanation,
                    {
                        expected: new NodeRef(
                            this.expectedType,
                            locales,
                            context,
                        ),
                        given: new NodeRef(this.givenType, locales, context),
                    },
                );
            },
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return IncompatibleType.LocalePath;
    }
}
