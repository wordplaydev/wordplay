import type LocaleText from '#locale/LocaleText.ts';
import type Expression from '#nodes/Expression.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import KeyValue from '#nodes/KeyValue.ts';
import type MapLiteral from '#nodes/MapLiteral.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Context from '#nodes/Context.ts';
import type Node from '#nodes/Node.ts';

export class NotAKeyValue extends Conflict {
    readonly map: MapLiteral;
    readonly expression: Expression;

    constructor(map: MapLiteral, expression: Expression) {
        super(ConflictSeverity.Error);
        this.map = map;
        this.expression = expression;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.MapLiteral.conflict.NotAKeyValue;

    getMessage() {
        return {
            node: this.expression,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => NotAKeyValue.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Wrap the malformed expression as a key-value pair, treating the
        // existing expression as the key and adding a placeholder value.
        const kv = KeyValue.make(this.expression, ExpressionPlaceholder.make());
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => NotAKeyValue.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.expression, kv],
                    ]),
                    newNode: kv,
                }),
            },
        ];
    }

    getLocalePath() {
        return NotAKeyValue.LocalePath;
    }
}
