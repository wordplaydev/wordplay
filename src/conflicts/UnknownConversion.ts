import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Convert from '#nodes/Convert.ts';
import type Type from '#nodes/Type.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';

export class UnknownConversion extends Conflict {
    readonly convert: Convert;
    readonly expectedType: Type;

    constructor(expr: Convert, expectedType: Type) {
        super(ConflictSeverity.Error);
        this.convert = expr;
        this.expectedType = expectedType;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Convert.conflict.UnknownConversion;

    getMessage() {
        return {
            node: this.convert,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => UnknownConversion.LocalePath(l).explanation,
                    {
                        expected: new NodeRef(
                            this.expectedType,
                            locales,
                            context,
                        ),
                        given: new NodeRef(this.convert.type, locales, context),
                    },
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Remove the convert wrapper, leaving just the inner expression.
        const inner = this.convert.expression;
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => UnknownConversion.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.convert, inner],
                    ]),
                    newNode: inner,
                }),
            },
        ];
    }

    getLocalePath() {
        return UnknownConversion.LocalePath;
    }
}
