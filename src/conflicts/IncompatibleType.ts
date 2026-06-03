import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import type Node from '@nodes/Node';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import findDivideByZeroSource from '@conflicts/findDivideByZeroSource';

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
        super(false);

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

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return IncompatibleType.LocalePath;
    }
}
