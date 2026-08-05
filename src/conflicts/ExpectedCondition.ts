import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import BooleanType from '@nodes/BooleanType';
import type Context from '@nodes/Context';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import Reaction from '@nodes/Reaction';

export default class ExpectedCondition extends Conflict {
    readonly reaction: Reaction;

    constructor(reaction: Reaction) {
        // Minor, like NoExpression: a reaction still being written parses and evaluates fine (to its
        // initial value), so this shouldn't block editing.
        super(ConflictSeverity.Minor);

        this.reaction = reaction;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Reaction.conflict.ExpectedCondition;

    getMessage() {
        // The gap itself: the parser leaves a token-less node there, and its view gives it width, so
        // the underline lands where the code belongs instead of on a neighbouring token.
        return {
            node: this.reaction.condition,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedCondition.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(_context: Context, _concepts: Node[]): Resolutions {
        // Give the reaction a boolean placeholder to decide when to change.
        const placeholder = ExpressionPlaceholder.make(BooleanType.make());
        const r = this.reaction;
        const filled = new Reaction(
            r.initial,
            r.dots,
            placeholder,
            r.nextdots,
            r.next,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedCondition.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.reaction, filled],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];
    }

    getLocalePath() {
        return ExpectedCondition.LocalePath;
    }
}
