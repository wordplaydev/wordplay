import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../nodes/Evaluate';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Reference from '../nodes/Reference';
import Unit from '../nodes/Unit';
import { ColorType, createColorLiteral } from '../output/Color';
import { PlaceType } from '../output/Place';
import { getFirstName } from '../translation/Translation';
import en from '../translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';

const PoseProperties: OutputProperty[] = [
    {
        name: getFirstName(en.output.pose.color.names),
        type: 'color',
        required: false,
        inherited: true,
        editable: (expr, context) =>
            expr instanceof Evaluate && expr.is(ColorType, context),
        create: (languages) => createColorLiteral(languages, 0.5, 100, 180),
    },
    {
        name: getFirstName(en.output.pose.opacity.names),
        type: new OutputPropertyRange(0, 1, 0.05, '%', 2),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1),
    },
    {
        name: getFirstName(en.output.pose.scale.names),
        type: new OutputPropertyRange(0, 10, 0.25, '', 2),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1),
    },
    {
        name: getFirstName(en.output.pose.tilt.names),
        type: new OutputPropertyRange(0, 360, 1, '°'),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(0, Unit.make(['°'])),
    },
    {
        name: getFirstName(en.output.pose.offset.names),
        type: 'place',
        required: false,
        inherited: false,
        editable: (expr, context) =>
            expr instanceof Evaluate && expr.is(PlaceType, context),
        create: (languages) =>
            Evaluate.make(
                Reference.make(
                    PlaceType.names.getTranslation(languages),
                    PlaceType
                ),
                []
            ),
    },
    {
        name: getFirstName(en.output.pose.flipx.names),
        type: 'bool',
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof BooleanLiteral,
        create: () => BooleanLiteral.make(false),
    },
    {
        name: getFirstName(en.output.pose.flipy.names),
        type: 'bool',
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof BooleanLiteral,
        create: () => BooleanLiteral.make(false),
    },
];

export default PoseProperties;
