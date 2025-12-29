// import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../../nodes/Evaluate';
import NumberLiteral from '../../nodes/NumberLiteral';
// import Reference from '../nodes/Reference';
// import Unit from '../nodes/Unit';
import type Project from '../../db/projects/Project';
import type LocaleText from '../../locale/LocaleText';
import { createColorLiteral } from '../../output/Color';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';

export default function getShadowProperties(
    project: Project,
    locale: LocaleText,
    // background: boolean
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Aura.offsetX.names,
            new OutputPropertyRange(0, 1, 0.01, 'px', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(12),
        ),
        new OutputProperty(
            (l) => l.output.Aura.color.names,
            'color',
            false,
            true,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (locales) => createColorLiteral(project, locales, 0.5, 100, 180),
        ),
        new OutputProperty(
            (l) => l.output.Aura.offsetY.names,
            new OutputPropertyRange(0, 1, 0.01, 'px', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(12),
        ),
        new OutputProperty(
            (l) => l.output.Aura.blur.names,
            new OutputPropertyRange(0, 1, 0.01, '', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(12),
        ),
    ];
}
