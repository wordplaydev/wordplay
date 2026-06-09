import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type TypePlaceholder from '@nodes/TypePlaceholder';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Repair,
    type Resolutions,
} from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';

export default class Placeholder extends Conflict {
    readonly placeholder: ExpressionPlaceholder | TypePlaceholder;

    constructor(placeholder: ExpressionPlaceholder | TypePlaceholder) {
        super(ConflictSeverity.Minor);
        this.placeholder = placeholder;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.ExpressionPlaceholder.conflict.Placeholder;

    getMessage() {
        return {
            node: this.placeholder,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => Placeholder.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, concepts: Node[]): Resolutions {
        // Mirror the autocomplete menu: for an expression placeholder, derive
        // candidates from the placeholder's expected type by asking each
        // member type for its default expression.
        if (!(this.placeholder instanceof ExpressionPlaceholder))
            return Conflict.fallbackExplainer(this, context, concepts);
        const defaults = ExpressionPlaceholder.getDefaultExpressions(
            this.placeholder,
            context,
            context.project.getLocales(),
        );
        if (defaults.length === 0)
            return Conflict.fallbackExplainer(this, context, concepts);
        const placeholder = this.placeholder;
        const candidates: Repair[] = defaults.map((def) => ({
            kind: 'repair',
            description: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => Placeholder.LocalePath(l).resolution,
                    { candidate: new NodeRef(def, locales, context) },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes([[placeholder, def]]),
                newNode: def,
            }),
        }));
        return candidates as readonly Repair[] as Resolutions;
    }

    getLocalePath() {
        return Placeholder.LocalePath;
    }
}
