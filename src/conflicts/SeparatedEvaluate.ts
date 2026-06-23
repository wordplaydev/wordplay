import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Block from '@nodes/Block';
import type Context from '@nodes/Context';
import type Reference from '@nodes/Reference';
import type Locales from '@locale/Locales';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export default class SeparatedEvaluate extends Conflict {
    readonly name: Reference;
    readonly inputs: Block;
    readonly structure: boolean;

    constructor(name: Reference, inputs: Block, structure: boolean) {
        super(ConflictSeverity.Error);

        this.name = name;
        this.inputs = inputs;
        this.structure = structure;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Evaluate.conflict.SeparatedEvaluate;

    getMessage() {
        return {
            node: this.name,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => SeparatedEvaluate.LocalePath(l).explanation,
                    {
                        name: new NodeRef(this.name, locales, context),
                        structure: this.structure,
                    },
                ),
        };
    }

    override getResolutions(context: Context, _concepts: Node[]): Resolutions {
        // Strip the whitespace before the inputs block so it sits adjacent to
        // the function name. Replace the project's source with one whose
        // Spaces mapping sets the gap to empty.
        const source = context.source;
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => SeparatedEvaluate.LocalePath(l).resolution,
                        {
                            name: new NodeRef(this.name, locales, context),
                        },
                    ),
                mediator: (ctx) => {
                    const newSpaces = source.spaces.withSpace(this.inputs, '');
                    const newSource = source.withSpaces(newSpaces);
                    return {
                        newProject: ctx.project.withSource(source, newSource),
                        newNode: this.name,
                    };
                },
            },
        ];
    }

    getLocalePath() {
        return SeparatedEvaluate.LocalePath;
    }
}
