import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Convert from '@nodes/Convert';
import type Type from '@nodes/Type';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export class UnknownConversion extends Conflict {
    readonly convert: Convert;
    readonly expectedType: Type;

    constructor(expr: Convert, expectedType: Type) {
        super(false);
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
                        expected: new NodeRef(this.expectedType, locales, context),
                        given: new NodeRef(this.convert.type, locales, context),
                    },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
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
