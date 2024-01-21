import Evaluate from '../nodes/Evaluate';
import { createColorLiteral } from '../output/Color';
import type Locale from '../locale/Locale';
import OutputProperty from './OutputProperty';
import type Project from '../models/Project';

export default function getAuraProperties(
    project: Project,
    locale: Locale,
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Aura.color,
            'color',
            false,
            true,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (locales) => createColorLiteral(project, locales, 0.5, 100, 180),
        ),
    ];
}
