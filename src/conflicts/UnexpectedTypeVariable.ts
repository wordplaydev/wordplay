import type LocaleText from '@locale/LocaleText';
import type Reference from '@nodes/Reference';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import TypeVariable from '@nodes/TypeVariable';
import TypeVariables from '@nodes/TypeVariables';

export class UnexpectedTypeVariable extends Conflict {
    readonly name: Reference;

    constructor(name: Reference) {
        super(false);
        this.name = name;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reference.conflict.UnexpectedTypeVariable;

    getMessage() {
        return {
            node: this.name,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => UnexpectedTypeVariable.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        // Find the TypeVariable this reference resolves to, then remove that
        // TypeVariable from its declaring TypeVariables list. The remaining
        // bare reference will then surface as UnknownName, whose repair
        // (Levenshtein suggestion) is more useful.
        const typeVar = this.name.resolve(context);
        if (!(typeVar instanceof TypeVariable))
            return Conflict.fallbackExplainer(this, context, concepts);
        const parent = context.source.root.getParent(typeVar);
        if (parent instanceof TypeVariables) {
            const filtered = parent.variables.filter((v) => v !== typeVar);
            // The TypeVariables grammar declares `variables: node(Names)`,
            // which mis-types the field and makes `parent.replace('variables', …)`
            // silently no-op. Construct the new node directly to bypass that.
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
                            (l) =>
                                UnexpectedTypeVariable.LocalePath(l).resolution,
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
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return UnexpectedTypeVariable.LocalePath;
    }
}
