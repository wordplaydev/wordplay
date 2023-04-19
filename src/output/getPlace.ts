import type Context from '../nodes/Context';
import type Evaluate from '../nodes/Evaluate';
import Expression from '../nodes/Expression';
import Evaluator from '../runtime/Evaluator';
import { toPlace } from './Place';

export function getPlace(evaluate: Evaluate, context: Context) {
    const place = evaluate.getExpressionFor('place', context);
    if (place instanceof Expression) {
        return toPlace(Evaluator.evaluateCode(place.toWordplay()));
    } else return toPlace(Evaluator.evaluateCode('Place()'));
}
