import KeyValue from '../nodes/KeyValue';
import MapLiteral from '../nodes/MapLiteral';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Unit from '../nodes/Unit';
import { createPoseLiteral } from '../output/Pose';
import type { NameTranslation } from '../translation/Translation';
import en from '../translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import { DurationProperty, StyleProperty } from './TypeOutputProperties';

function getTranslation(name: NameTranslation) {
    return typeof name === 'string' ? name : name[0];
}

const SequenceProperties: OutputProperty[] = [
    {
        name: getTranslation(en.output.sequence.poses.name),
        type: 'poses',
        required: true,
        inherited: false,
        editable: (expr) => expr instanceof MapLiteral,
        create: (languages) =>
            MapLiteral.make([
                KeyValue.make(
                    MeasurementLiteral.make(0, Unit.make(['%'])),
                    createPoseLiteral(languages)
                ),
                KeyValue.make(
                    MeasurementLiteral.make(100, Unit.make(['%'])),
                    createPoseLiteral(languages)
                ),
            ]),
    },
    DurationProperty,
    StyleProperty,
    {
        name: getTranslation(en.output.sequence.count.name),
        type: new OutputPropertyRange(1, 5, 1, 'x', 0),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1, Unit.make(['x'])),
    },
];

export default SequenceProperties;
