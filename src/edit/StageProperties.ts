import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import ListLiteral from '../nodes/ListLiteral';
import NumberLiteral from '../nodes/NumberLiteral';
import Unit from '../nodes/Unit';
import OutputProperty from './OutputProperty';
import OutputPropertyRange from './OutputPropertyRange';

export default function getStageProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Stage.content,
            'content',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([])
        ),
        new OutputProperty(
            locale.output.Stage.gravity,
            new OutputPropertyRange(0, 20, 1, 'm/s^2'),
            true,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('9.8', Unit.create(['m'], ['s', 's']))
        ),
    ];
}
