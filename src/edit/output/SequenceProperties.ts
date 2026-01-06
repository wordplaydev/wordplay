import TextLiteral from '@nodes/TextLiteral';
import type Project from '../../db/projects/Project';
import type Locales from '../../locale/Locales';
import KeyValue from '../../nodes/KeyValue';
import MapLiteral from '../../nodes/MapLiteral';
import NumberLiteral from '../../nodes/NumberLiteral';
import Unit from '../../nodes/Unit';
import { createPoseLiteral } from '../../output/Pose';
import { getDurationProperty, getStyleProperty } from './OutputProperties';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';
import OutputPropertyText from './OutputPropertyText';

export default function getSequenceProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Sequence.poses.names,
            'poses',
            true,
            false,
            (expr) => expr instanceof MapLiteral,
            (languages) =>
                MapLiteral.make([
                    KeyValue.make(
                        NumberLiteral.make('0%'),
                        createPoseLiteral(project, languages),
                    ),
                    KeyValue.make(
                        NumberLiteral.make('100%'),
                        createPoseLiteral(project, languages),
                    ),
                ]),
        ),
        getDurationProperty(locales),
        getStyleProperty(locales),
        new OutputProperty(
            (l) => l.output.Sequence.count.names,
            new OutputPropertyRange(1, 5, 1, 'x', 0),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(1, Unit.create(['x'])),
        ),
        new OutputProperty(
            (l) => l.output.Sequence.description.names,
            new OutputPropertyText(() => true),
            false,
            false,
            () => true,
            () => TextLiteral.make(''),
        ),
    ];
}
