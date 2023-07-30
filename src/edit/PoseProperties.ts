import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../nodes/Evaluate';
import NumberLiteral from '../nodes/NumberLiteral';
import Reference from '../nodes/Reference';
import Unit from '../nodes/Unit';
import { createColorLiteral } from '../output/Color';
import type { Locale } from '../locale/Locale';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import type Project from '../models/Project';

export default function getPoseProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Pose.color,
            'color',
            false,
            true,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Color, context),
            (languages) => createColorLiteral(project, languages, 0.5, 100, 180)
        ),
        new OutputProperty(
            locale.output.Pose.opacity,
            new OutputPropertyRange(0, 1, 0.01, '%', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1)
        ),
        new OutputProperty(
            locale.output.Pose.scale,
            new OutputPropertyRange(0, 10, 0.25, '', 2),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1)
        ),
        new OutputProperty(
            locale.output.Pose.rotation,
            new OutputPropertyRange(0, 360, 1, '°'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(0, Unit.make(['°']))
        ),
        new OutputProperty(
            locale.output.Pose.offset,
            'place',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Place, context),
            (languages) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.Place.names.getLocaleText(
                            languages
                        ),
                        project.shares.output.Place
                    ),
                    [
                        NumberLiteral.make(0, Unit.make(['m'])),
                        NumberLiteral.make(0, Unit.make(['m'])),
                        NumberLiteral.make(0, Unit.make(['m'])),
                    ]
                )
        ),
        new OutputProperty(
            locale.output.Pose.flipx,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
        new OutputProperty(
            locale.output.Pose.flipy,
            'bool',
            false,
            false,
            (expr) => expr instanceof BooleanLiteral,
            () => BooleanLiteral.make(false)
        ),
    ];
}
