import type Evaluator from '@runtime/Evaluator';
import type Context from './Context';
import Expression, { ExpressionKind } from './Expression';
import type Locales from '../locale/Locales';

export default abstract class SimpleExpression extends Expression {
    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator
    ) {
        return this.getStartExplanations(locales, context, evaluator);
    }

    getKind() {
        return ExpressionKind.Simple;
    }
}
