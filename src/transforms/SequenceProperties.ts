import KeyValue from '../nodes/KeyValue';
import MapLiteral from '../nodes/MapLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import Unit from '../nodes/Unit';
import { createPoseLiteral } from '../output/Pose';
import type { Locale, NameText } from '../locale/Locale';
import type OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import { getDurationProperty, getStyleProperty } from './TypeOutputProperties';
import type Project from '../models/Project';

function getLocale(name: NameText) {
    return typeof name === 'string' ? name : name[0];
}

export default function getSequenceProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        {
            name: getLocale(locale.output.Sequence.poses.names),
            type: 'poses',
            required: true,
            inherited: false,
            editable: (expr) => expr instanceof MapLiteral,
            create: (languages) =>
                MapLiteral.make([
                    KeyValue.make(
                        NumberLiteral.make('0%'),
                        createPoseLiteral(project, languages)
                    ),
                    KeyValue.make(
                        NumberLiteral.make('100%'),
                        createPoseLiteral(project, languages)
                    ),
                ]),
        },
        getDurationProperty(locale),
        getStyleProperty(locale),
        {
            name: getLocale(locale.output.Sequence.count.names),
            type: new OutputPropertyRange(1, 5, 1, 'x', 0),
            required: false,
            inherited: false,
            editable: (expr) => expr instanceof NumberLiteral,
            create: () => NumberLiteral.make(1, Unit.make(['x'])),
        },
    ];
}
