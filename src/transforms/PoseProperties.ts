import BooleanLiteral from '../nodes/BooleanLiteral';
import Evaluate from '../nodes/Evaluate';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import { ColorType, createColorLiteral } from '../output/Color';
import { getFirstName } from '../translation/Translation';
import en from '../translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';

const PoseProperties: OutputProperty[] = [
    {
        name: getFirstName(en.output.pose.color.name),
        type: 'color',
        required: false,
        inherited: true,
        editable: (expr, context) =>
            expr instanceof Evaluate && expr.is(ColorType, context),
        create: (languages) => createColorLiteral(languages, 0.5, 100, 180),
    },
    {
        name: getFirstName(en.output.pose.opacity.name),
        type: new OutputPropertyRange(0, 1, 0.05, '%', 2),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1),
    },
    {
        name: getFirstName(en.output.pose.scale.name),
        type: new OutputPropertyRange(0, 10, 0.25, '', 2),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1),
    },
    {
        name: getFirstName(en.output.pose.flipx.name),
        type: 'bool',
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof BooleanLiteral,
        create: () => BooleanLiteral.make(false),
    },
    {
        name: getFirstName(en.output.pose.flipy.name),
        type: 'bool',
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof BooleanLiteral,
        create: () => BooleanLiteral.make(false),
    },
];

export default PoseProperties;
