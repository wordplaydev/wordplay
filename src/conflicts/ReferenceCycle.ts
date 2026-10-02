import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Reference from '#nodes/Reference.ts';
import type Locales from '#locale/Locales.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import Bind from '#nodes/Bind.ts';
import type Type from '#nodes/Type.ts';

export default class ReferenceCycle extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(ConflictSeverity.Minor);

        this.name = name;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reference.conflict.ReferenceCycle;

    getMessage() {
        return {
            node: this.name,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => ReferenceCycle.LocalePath(l).explanation,
                    {
                        name: new NodeRef(
                            this.name,
                            locales,
                            context,
                            this.name.getName(),
                        ),
                    },
                ),
        };
    }

    override getResolutions(context: Context, _concepts: Node[]): Resolutions {
        // Break the cycle by replacing the offending self-reference with a
        // typed expression placeholder. The Reference's expected type comes
        // from walking up to the enclosing Bind's declared type — if any.
        // Falls back to untyped when we can't infer a useful type.
        const ancestors = context.source.root.getAncestors(this.name) ?? [];
        let expectedType: Type | undefined;
        for (const ancestor of ancestors) {
            if (ancestor instanceof Bind && ancestor.type !== undefined) {
                expectedType = ancestor.type;
                break;
            }
        }
        const placeholder = ExpressionPlaceholder.make(expectedType);
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ReferenceCycle.LocalePath(l).resolution,
                        {
                            name: new NodeRef(
                                this.name,
                                locales,
                                context,
                                this.name.getName(),
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.name, placeholder],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return ReferenceCycle.LocalePath;
    }
}
