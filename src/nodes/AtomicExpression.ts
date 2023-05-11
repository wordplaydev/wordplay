import type Evaluator from '@runtime/Evaluator';
import type Locale from '@locale/Locale';
import type Context from './Context';
import Expression from './Expression';

export default abstract class AtomicExpression extends Expression {
    getFinishExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return this.getStartExplanations(translation, context, evaluator);
    }
}
