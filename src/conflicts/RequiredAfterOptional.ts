import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import StreamDefinition from '@nodes/StreamDefinition';

export default class RequiredAfterOptional extends Conflict {
    readonly bind: Bind;

    constructor(bind: Bind) {
        super(false);

        this.bind = bind;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Bind.conflict.RequiredAfterOptional;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => RequiredAfterOptional.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        // Move all required inputs before optional ones, preserving order
        // within each group (stable partition).
        const parent = context.source.root.getParent(this.bind);
        if (
            parent instanceof FunctionDefinition ||
            parent instanceof StructureDefinition ||
            parent instanceof StreamDefinition
        ) {
            const required = parent.inputs.filter((b) => b.isRequired());
            const optional = parent.inputs.filter((b) => !b.isRequired());
            const reordered: Bind[] = [...required, ...optional];
            // Skip if the order is already correct (paranoia — the conflict
            // shouldn't have fired in that case).
            if (
                reordered.length === parent.inputs.length &&
                reordered.some((b, i) => b !== parent.inputs[i])
            ) {
                const newParent = parent.replace('inputs', reordered);
                return [
                    {
                        kind: 'repair',
                        description: (locales: Locales) =>
                            locales.concretize(
                                (l) =>
                                    RequiredAfterOptional.LocalePath(l)
                                        .explanation,
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
        }
        return Conflict.fallbackExplainer(this, context, concepts);
    }

    getLocalePath() {
        return RequiredAfterOptional.LocalePath;
    }
}
