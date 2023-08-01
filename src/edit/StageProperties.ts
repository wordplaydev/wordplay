import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import ListLiteral from '../nodes/ListLiteral';
import { createColorLiteral } from '../output/Color';
import OutputProperty from './OutputProperty';

export default function getStageProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Stage.content,
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([])
        ),
        new OutputProperty(
            locale.output.Stage.background,
            'color' as const,
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (languages) => createColorLiteral(project, languages, 0.5, 100, 180)
        ),
    ];
}
