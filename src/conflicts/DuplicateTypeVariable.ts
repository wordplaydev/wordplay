import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type TypeVariable from '@nodes/TypeVariable';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';
import TypeVariables from '@nodes/TypeVariables';

export default class DuplicateTypeVariable extends Conflict {
    readonly typeVar: TypeVariable;
    readonly duplicate: TypeVariable;

    constructor(typeVar: TypeVariable, duplicate: TypeVariable) {
        super(false);

        this.typeVar = typeVar;
        this.duplicate = duplicate;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.TypeVariable.conflict.DuplicateTypeVariable;

    getMessage() {
        return {
            node: this.typeVar,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => DuplicateTypeVariable.LocalePath(l).explanation,
                    {
                        duplicate: new NodeRef(
                        this.duplicate,
                        locales,
                        context,
                        locales.getName(this.duplicate.names),
                    ),
                    },
                ),
        };
    }

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        // Replace the parent TypeVariables list with one that omits the
        // duplicate. Removing via `[duplicate, undefined]` alone leaves the
        // parent's array slot in an inconsistent state.
        const parent = context.source.root.getParent(this.duplicate);
        if (!(parent instanceof TypeVariables))
            return Conflict.fallbackExplainer(this, context, concepts);
        const filtered = parent.variables.filter((v) => v !== this.duplicate);
        // The TypeVariables grammar mis-types `variables` as `node(Names)`
        // (singular), which makes `parent.replace('variables', …)` silently
        // no-op. Construct the new node directly.
        const newParent = new TypeVariables(
            parent.open,
            filtered,
            parent.close,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => DuplicateTypeVariable.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [parent, newParent],
                    ]),
                    newNode: newParent,
                }),
            },
        ];
    }

    getLocalePath() {
        return DuplicateTypeVariable.LocalePath;
    }
}
