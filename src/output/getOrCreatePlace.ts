import type Locales from '../locale/Locales';
import type Project from '../models/Project';
import type Context from '../nodes/Context';
import Evaluate from '../nodes/Evaluate';
import evaluateCode from '../runtime/evaluate';
import { toPlace } from './Place';

export function getPlaceExpression(
    project: Project,
    evaluate: Evaluate,
    context: Context
) {
    return (
        evaluate.getInput(project.shares.output.Phrase.inputs[3], context) ??
        evaluate.getInput(project.shares.output.Group.inputs[4], context)
    );
}

export function getOrCreatePlace(
    project: Project,
    locales: Locales,
    evaluate: Evaluate,
    context: Context
) {
    const place = getPlaceExpression(project, evaluate, context);
    if (place instanceof Evaluate) {
        // Only return a place if it's a Place creator.
        if (
            place.is(project.shares.output.Place, project.getNodeContext(place))
        )
            return toPlace(evaluateCode(place.toWordplay(), [], locales));
        else return undefined;
    } else
        return toPlace(
            evaluateCode(`${project.shares.output.Place.names.getNames()[0]}()`)
        );
}
