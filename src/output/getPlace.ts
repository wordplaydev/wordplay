import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import type Context from '../nodes/Context';
import Evaluate from '../nodes/Evaluate';
import evaluateCode from '../runtime/evaluate';
import { toPlace } from './Place';

export function getPlace(
    project: Project,
    locale: Locale,
    evaluate: Evaluate,
    context: Context
) {
    const place = evaluate.getExpressionFor('place', context);
    if (place instanceof Evaluate) {
        if (
            place.is(project.shares.output.Place, project.getNodeContext(place))
        )
            return toPlace(evaluateCode(place.toWordplay(), [], locale));
        else return undefined;
    } else return toPlace(evaluateCode('Place()', [], locale));
}
