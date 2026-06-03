import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import type Node from '@nodes/Node';
import Expression from '@nodes/Expression';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import findDivideByZeroSource from '@conflicts/findDivideByZeroSource';

export default class IncompatibleInput extends Conflict {
    readonly givenNode: Node;
    readonly givenType: Type;
    readonly expectedType: Type;

    constructor(givenInput: Node, givenType: Type, expectedType: Type) {
        super(false);
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

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        return Conflict.fromRegistry(this, context, concepts);
    }

    getLocalePath() {
        return IncompatibleInput.LocalePath;
    }
}
