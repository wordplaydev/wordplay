import type Evaluator from '#runtime/Evaluator.ts';
import type Locales from '#locale/Locales.ts';
import type Context from '#nodes/Context.ts';
import Expression, { ExpressionKind } from '#nodes/Expression.ts';

export default abstract class SimpleExpression extends Expression {
    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return this.getStartExplanations(locales, context, evaluator);
    }

    getKind(): ExpressionKind {
        return ExpressionKind.Simple;
    }
}
