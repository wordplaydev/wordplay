import type Locale from '../locale/Locale';
import type Context from '../nodes/Context';
import type Evaluate from '../nodes/Evaluate';
import Expression from '../nodes/Expression';
import evaluateCode from '../runtime/evaluate';
import { toPlace } from './Place';

export function getPlace(locale: Locale, evaluate: Evaluate, context: Context) {
    const place = evaluate.getExpressionFor('place', context);
    if (place instanceof Expression) {
        return toPlace(evaluateCode(place.toWordplay(), [], locale));
    } else return toPlace(evaluateCode('Place()', [], locale));
}
