import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import ListLiteral from '../nodes/ListLiteral';
import OutputProperty from './OutputProperty';

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
    ];
}
