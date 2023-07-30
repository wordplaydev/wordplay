import type { Basis } from '../basis/Basis';
import type Context from '../nodes/Context';
import type Evaluate from '../nodes/Evaluate';
import Expression from '../nodes/Expression';
import Evaluator from '../runtime/Evaluator';
import { toPlace } from './Place';

export function getPlace(basis: Basis, evaluate: Evaluate, context: Context) {
    const place = evaluate.getExpressionFor('place', context);
    if (place instanceof Expression) {
        return toPlace(Evaluator.evaluateCode(basis, place.toWordplay()));
    } else return toPlace(Evaluator.evaluateCode(basis, 'Place()'));
}
