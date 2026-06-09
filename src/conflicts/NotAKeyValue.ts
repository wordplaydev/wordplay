import type LocaleText from '@locale/LocaleText';
import type Expression from '@nodes/Expression';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import KeyValue from '@nodes/KeyValue';
import type MapLiteral from '@nodes/MapLiteral';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

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
