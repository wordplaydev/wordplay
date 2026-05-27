import type LocaleText from '@locale/LocaleText';
import type Bind from '@nodes/Bind';
import type Locales from '@locale/Locales';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Node from '@nodes/Node';
import FunctionDefinition from '@nodes/FunctionDefinition';
import StructureDefinition from '@nodes/StructureDefinition';
import StreamDefinition from '@nodes/StreamDefinition';

export default class InputListMustBeLast extends Conflict {
    readonly bind: Bind;

    constructor(rest: Bind) {
        super(false);

        this.bind = rest;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Evaluate.conflict.InputListMustBeLast;

    getMessage() {
        return {
            node: this.bind,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => InputListMustBeLast.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(
        context: Context,
        concepts: Node[],
    ): Resolutions {
        // Find the function/structure/stream definition this bind sits in and
        // move the variadic bind to the end of its inputs.
        const parent = context.source.root.getParent(this.bind);
        if (
            parent instanceof FunctionDefinition ||
            parent instanceof StructureDefinition ||
            parent instanceof StreamDefinition
        ) {
            const reordered: Bind[] = [
                ...parent.inputs.filter((b) => b !== this.bind),
                this.bind,
            ];
            const newParent = parent.replace('inputs', reordered);
            return [
                {
                    kind: 'repair',
                    description: (locales: Locales) =>
                        locales.concretize(
                            (l) =>
                                InputListMustBeLast.LocalePath(l).resolution,
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
        return InputListMustBeLast.LocalePath;
    }
}
