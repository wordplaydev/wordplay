import TextLiteral from '#nodes/TextLiteral.ts';
import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import KeyValue from '#nodes/KeyValue.ts';
import MapLiteral from '#nodes/MapLiteral.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Unit from '#nodes/Unit.ts';
import { createPoseLiteral } from '#output/animation/Pose.ts';
import {
    getDurationProperty,
    getStyleProperty,
} from '#edit/output/OutputProperties.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';
import OutputPropertyText from '#edit/output/OutputPropertyText.ts';

/** The default two-keyframe poses map used when a sequence has no custom poses. */
export function createDefaultPosesMap(
    project: Project,
    locales: Locales,
): MapLiteral {
    return MapLiteral.make([
        KeyValue.make(
            NumberLiteral.make('0%'),
            createPoseLiteral(project, locales),
        ),
        KeyValue.make(
            NumberLiteral.make('100%'),
            createPoseLiteral(project, locales),
        ),
    ]);
}

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
            (languages) => createDefaultPosesMap(project, languages),
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
