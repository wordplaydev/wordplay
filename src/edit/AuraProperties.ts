import Evaluate from '../nodes/Evaluate';
import { createColorLiteral } from '../output/Color';
import type LocaleText from '../locale/LocaleText';
import OutputProperty from './OutputProperty';
import type Project from '../db/projects/Project';

export default function getAuraProperties(
    project: Project,
    locale: LocaleText,
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
