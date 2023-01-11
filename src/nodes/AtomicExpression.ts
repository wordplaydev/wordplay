import type Evaluator from '../runtime/Evaluator';
import type Translation from '../translation/Translation';
import type Context from './Context';
import Expression from './Expression';

export default abstract class AtomicExpression extends Expression {
    getFinishExplanations(
        translation: Translation,
        context: Context,
        evaluator: Evaluator
    ) {
        return this.getStartExplanations(translation, context, evaluator);
    }
}
