// import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../nodes/Evaluate';
import NumberLiteral from '../nodes/NumberLiteral';
// import Reference from '../nodes/Reference';
// import Unit from '../nodes/Unit';
import { createColorLiteral } from '../output/Color';
import type Locale from '../locale/Locale';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import type Project from '../models/Project';

export default function getShadowProperties(
    project: Project,
    locale: Locale,
    // background: boolean
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Aura.offsetX,
            new OutputPropertyRange(0, 1, 0.01, 'px', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(12)
        ),
        new OutputProperty(
            locale.output.Aura.color,
            'color',
            false,
            true,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (locales) => createColorLiteral(project, locales, 0.5, 100, 180)
        ),
        new OutputProperty(
          locale.output.Aura.offsetY,
          new OutputPropertyRange(0, 1, 0.01, 'px', 0),
          false,
          false,
          (expr) => expr instanceof NumberLiteral,
          () => NumberLiteral.make(12)
        ),
        new OutputProperty(
          locale.output.Aura.blur,
          new OutputPropertyRange(0, 1, 0.01, '', 0),
          false,
          false,
          (expr) => expr instanceof NumberLiteral,
          () => NumberLiteral.make(12)
        )
    ];
}
