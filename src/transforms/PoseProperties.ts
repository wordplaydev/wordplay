import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../nodes/Evaluate';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Reference from '../nodes/Reference';
import Unit from '../nodes/Unit';
import { createColorLiteral } from '../output/Color';
import { getFirstName, type Locale } from '../locale/Locale';
import type OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import type Project from '../models/Project';

export default function getPoseProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        {
            name: getFirstName(locale.output.Pose.color.names),
            type: 'color',
            required: false,
            inherited: true,
            editable: (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.color, context),
            create: (languages) =>
                createColorLiteral(project, languages, 0.5, 100, 180),
        },
        {
            name: getFirstName(locale.output.Pose.opacity.names),
            type: new OutputPropertyRange(0, 1, 0.05, '%', 2),
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof MeasurementLiteral,
            create: () => MeasurementLiteral.make(1),
        },
        {
            name: getFirstName(locale.output.Pose.scale.names),
            type: new OutputPropertyRange(0, 10, 0.25, '', 2),
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof MeasurementLiteral,
            create: () => MeasurementLiteral.make(1),
        },
        {
            name: getFirstName(locale.output.Pose.tilt.names),
            type: new OutputPropertyRange(0, 360, 1, '°'),
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof MeasurementLiteral,
            create: () => MeasurementLiteral.make(0, Unit.make(['°'])),
        },
        {
            name: getFirstName(locale.output.Pose.offset.names),
            type: 'place',
            required: false,
            inherited: false,
            editable: (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.place, context),
            create: (languages) =>
                Evaluate.make(
                    Reference.make(
                        project.shares.output.place.names.getLocaleText(
                            languages
                        ),
                        project.shares.output.place
                    ),
                    []
                ),
        },
        {
            name: getFirstName(locale.output.Pose.flipx.names),
            type: 'bool',
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof BooleanLiteral,
            create: () => BooleanLiteral.make(false),
        },
        {
            name: getFirstName(locale.output.Pose.flipy.names),
            type: 'bool',
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof BooleanLiteral,
            create: () => BooleanLiteral.make(false),
        },
    ];
}
