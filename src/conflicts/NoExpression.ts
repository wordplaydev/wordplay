import type LocaleText from '#locale/LocaleText.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export default class NoExpression extends Conflict {
    readonly def: FunctionDefinition;

    constructor(def: FunctionDefinition) {
        super(ConflictSeverity.Minor);

        this.def = def;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.FunctionDefinition.conflict.NoExpression;

    getMessage() {
        return {
            node: this.def.names,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NoExpression.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Set the function's body to an expression placeholder.
        const placeholder = ExpressionPlaceholder.make();
        const d = this.def;
        const filled = new FunctionDefinition(
            d.docs,
            d.share,
            d.fun,
            d.names,
            d.types,
            d.open,
            d.inputs,
            d.close,
            d.dot,
            d.output,
            placeholder,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => NoExpression.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.def, filled],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return NoExpression.LocalePath;
    }
}
