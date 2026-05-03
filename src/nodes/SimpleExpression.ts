import type Evaluator from '@runtime/Evaluator';
import type Locales from '@locale/Locales';
import type Context from '@nodes/Context';
import Expression, { ExpressionKind } from '@nodes/Expression';

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
