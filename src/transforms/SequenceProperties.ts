import KeyValue from '../nodes/KeyValue';
import MapLiteral from '../nodes/MapLiteral';
import MeasurementLiteral from '../nodes/MeasurementLiteral';
import Unit from '../nodes/Unit';
import { createPoseLiteral } from '../output/Pose';
import type { NameText } from '../translation/Locale';
import en from '../translation/translations/en';
import type OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import { DurationProperty, StyleProperty } from './TypeOutputProperties';

function getLocale(name: NameText) {
    return typeof name === 'string' ? name : name[0];
}

const SequenceProperties: OutputProperty[] = [
    {
        name: getLocale(en.output.sequence.poses.names),
        type: 'poses',
        required: true,
        inherited: false,
        editable: (expr) => expr instanceof MapLiteral,
        create: (languages) =>
            MapLiteral.make([
                KeyValue.make(
                    MeasurementLiteral.make('0%'),
                    createPoseLiteral(languages)
                ),
                KeyValue.make(
                    MeasurementLiteral.make('100%'),
                    createPoseLiteral(languages)
                ),
            ]),
    },
    DurationProperty,
    StyleProperty,
    {
        name: getLocale(en.output.sequence.count.names),
        type: new OutputPropertyRange(1, 5, 1, 'x', 0),
        required: false,
        inherited: false,
        editable: (expr) => expr instanceof MeasurementLiteral,
        create: () => MeasurementLiteral.make(1, Unit.make(['x'])),
    },
];

export default SequenceProperties;
