import type Locale from '../locale/Locale';
import type Context from '../nodes/Context';
import type Evaluate from '../nodes/Evaluate';
import Expression from '../nodes/Expression';
import Evaluator from '../runtime/Evaluator';
import { toPlace } from './Place';

export function getPlace(locale: Locale, evaluate: Evaluate, context: Context) {
    const place = evaluate.getExpressionFor('place', context);
    if (place instanceof Expression) {
        return toPlace(Evaluator.evaluateCode(locale, place.toWordplay()));
    } else return toPlace(Evaluator.evaluateCode(locale, 'Place()'));
}
