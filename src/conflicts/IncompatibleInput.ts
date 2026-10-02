import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import type Node from '#nodes/Node.ts';
import Expression from '#nodes/Expression.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import findDivideByZeroSource from '#conflicts/findDivideByZeroSource.ts';

export default class IncompatibleInput extends Conflict {
    readonly givenNode: Node;
    readonly givenType: Type;
    readonly expectedType: Type;

    constructor(givenInput: Node, givenType: Type, expectedType: Type) {
        super(ConflictSeverity.Error);
        this.givenNode = givenInput;
        this.givenType = givenType;
        this.expectedType = expectedType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.IncompatibleInput;

    getMessage() {
        return {
            node: this.givenNode,
            explanation: (locales: Locales, context: Context) => {
                // If the incompatible ø traces to a possible divide-by-zero,
                // explain that specifically instead of a generic type mismatch.
                const source =
                    this.givenNode instanceof Expression
                        ? findDivideByZeroSource(this.givenNode, context)
                        : undefined;
                if (source !== undefined)
                    return locales.concretize(
                        (l) =>
                            IncompatibleInput.LocalePath(l)
                                .explanationDivideByZero,
                        { source: new NodeRef(source, locales, context) },
                    );
                return locales.concretize(
                    (l) => IncompatibleInput.LocalePath(l).explanation,
                    {
                        expected: new NodeRef(
                            this.expectedType.simplify(context),
                            locales,
                            context,
                        ),
                        given: new NodeRef(
                            this.givenType.simplify(context),
                            locales,
                            context,
                        ),
                    },
                );
            },
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return IncompatibleInput.LocalePath;
    }
}
