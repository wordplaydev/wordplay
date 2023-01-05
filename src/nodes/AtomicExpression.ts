import type Translation from '../translations/Translation';
import type Context from './Context';
import Expression from './Expression';

export default abstract class AtomicExpression extends Expression {
    getFinishExplanations(translation: Translation, context: Context) {
        return this.getStartExplanations(translation, context);
    }
}
