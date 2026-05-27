import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type Context from '@nodes/Context';
import type Locales from '@locale/Locales';
import type Reaction from '@nodes/Reaction';
import Conflict, { type Resolutions } from '@conflicts/Conflict';
import type Node from '@nodes/Node';

export default class ExpectedStream extends Conflict {
    readonly reaction: Reaction;

    constructor(reaction: Reaction) {
        super(true);

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
                        condition: new NodeRef(this.reaction.condition, locales, context),
                    },
                ),
        };
    }

    override getResolutions(
        _context: Context,
        _concepts: Node[],
    ): Resolutions {
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
