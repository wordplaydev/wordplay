import KeyValue from '../nodes/KeyValue';
import MapLiteral from '../nodes/MapLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import Unit from '../nodes/Unit';
import { createPoseLiteral } from '../output/Pose';
import type Locale from '../locale/Locale';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import { getDurationProperty, getStyleProperty } from './OutputProperties';
import type Project from '../models/Project';

export default function getSequenceProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Sequence.poses,
            'poses',
            true,
            false,
            (expr) => expr instanceof MapLiteral,
            (languages) =>
                MapLiteral.make([
                    KeyValue.make(
                        NumberLiteral.make('0%'),
                        createPoseLiteral(project, languages)
                    ),
                    KeyValue.make(
                        NumberLiteral.make('100%'),
                        createPoseLiteral(project, languages)
                    ),
                ])
        ),
        getDurationProperty(locale),
        getStyleProperty(locale),
        new OutputProperty(
            locale.output.Sequence.count,
            new OutputPropertyRange(1, 5, 1, 'x', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.create(['x']))
        ),
    ];
}
