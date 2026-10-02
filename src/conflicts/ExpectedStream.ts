import type LocaleText from '#locale/LocaleText.ts';
import NodeRef from '#locale/NodeRef.ts';
import type Context from '#nodes/Context.ts';
import type Locales from '#locale/Locales.ts';
import type Reaction from '#nodes/Reaction.ts';
import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '#conflicts/Conflict.ts';
import type Node from '#nodes/Node.ts';

export default class ExpectedStream extends Conflict {
    readonly reaction: Reaction;

    constructor(reaction: Reaction) {
        super(ConflictSeverity.Minor);

        this.reaction = reaction;
    }

    static readonly LocalePath = (locales: LocaleText) =>
        locales.node.Reaction.conflict.ExpectedStream;

    getMessage() {
        return {
            node: this.reaction.condition,
            explanation: (locales: Locales, context: Context) =>
                locales.concretize(
                    (l) => ExpectedStream.LocalePath(l).explanation,
                    {
                        condition: new NodeRef(
                            this.reaction.condition,
                            locales,
                            context,
                        ),
                    },
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Replace the broken Reaction with just its initial value — the
        // learner can rebuild the reaction with a real stream-driven
        // condition. (Suggesting a specific stream construct would require
        // scope analysis; the simplest correct repair is to drop the broken
        // reactivity.)
        const replacement = this.reaction.initial;
        return [
            {
                kind: 'repair',
                description: (locales: Locales, context: Context) =>
                    locales.concretize(
                        (l) => ExpectedStream.LocalePath(l).resolution,
                        {
                            condition: new NodeRef(
                                this.reaction.condition,
                                locales,
                                context,
                            ),
                        },
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.reaction, replacement],
                    ]),
                    newNode: replacement,
                }),
            },
        ];
    }

    getLocalePath() {
        return ExpectedStream.LocalePath;
    }
}
