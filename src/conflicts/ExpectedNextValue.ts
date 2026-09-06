import Conflict, {
    ConflictSeverity,
    type Resolutions,
} from '@conflicts/Conflict';
import type LocaleText from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import ExpressionPlaceholder from '@nodes/ExpressionPlaceholder';
import type Node from '@nodes/Node';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import NumberType from '@nodes/NumberType';
import Reaction from '@nodes/Reaction';
import Reference from '@nodes/Reference';
import StreamToken from '@nodes/StreamToken';
import { RANGE_SYMBOL } from '@parser/Symbols';

export default class ExpectedNextValue extends Conflict {
    readonly reaction: Reaction;

    constructor(reaction: Reaction) {
        // Minor, like NoExpression: a reaction still being written parses and evaluates fine (to its
        // initial value), so this shouldn't block editing.
        super(ConflictSeverity.Minor);

        this.reaction = reaction;
    }

    static readonly LocalePath = (locale: LocaleText) =>
        locale.node.Reaction.conflict.ExpectedNextValue;

    getMessage() {
        // The gap itself: the parser leaves a token-less node there, and its view gives it width, so
        // the underline lands where the code belongs instead of on a neighbouring token.
        return {
            node: this.reaction.next,
            explanation: (locales: Locales) =>
                locales.concretize(
                    (l) => ExpectedNextValue.LocalePath(l).explanation,
                ),
        };
    }

    override getResolutions(context: Context, _concepts: Node[]): Resolutions {
        // Give the reaction a placeholder to change to, and the second `…` if it doesn't have one, so
        // the repaired reaction reads the way reactions are usually written.
        const placeholder = ExpressionPlaceholder.make();
        const r = this.reaction;
        const filled = new Reaction(
            r.initial,
            r.dots,
            r.condition,
            r.nextdots ?? new StreamToken(),
            placeholder,
        );
        const fill: Resolutions = [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedNextValue.LocalePath(l).resolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.reaction, filled],
                    ]),
                    newNode: placeholder,
                }),
            },
        ];

        // `1…10` is a reaction only by accident: the stream symbol is one dot away from the
        // range symbol, and a half-written reaction between two numbers is far more likely to
        // be a range someone typed a third dot into. Offer the swap first, and only when both
        // sides are numbers, so this never shows up on a reaction that's merely unfinished.
        const bothNumbers =
            r.condition !== undefined &&
            r.initial.getType(context) instanceof NumberType &&
            r.condition.getType(context) instanceof NumberType;
        if (!bothNumbers || r.condition === undefined) return fill;

        const range = new BinaryEvaluate(
            r.initial,
            Reference.make(RANGE_SYMBOL),
            r.condition,
        );
        return [
            {
                kind: 'repair',
                description: (locales: Locales) =>
                    locales.concretize(
                        (l) => ExpectedNextValue.LocalePath(l).rangeResolution,
                    ),
                mediator: (ctx) => ({
                    newProject: ctx.project.withRevisedNodes([
                        [this.reaction, range],
                    ]),
                    newNode: range,
                }),
            },
            ...fill,
        ];
    }

    getLocalePath() {
        return ExpectedNextValue.LocalePath;
    }
}
