import type Locale from '../locale/Locale';
import type Project from '../models/Project';
import ListLiteral from '../nodes/ListLiteral';
import { getOutputProperties } from './OutputProperties';
import OutputProperty from './OutputProperty';

export default function getShapeProperties(
    project: Project,
    locale: Locale
): OutputProperty[] {
    return [
        new OutputProperty(
            locale.output.Shape.form,
            'form',
            true,
            false,
            (expr) => expr instanceof ListLiteral,
            () => ListLiteral.make([])
        ),
        ...getOutputProperties(project, locale),
    ];
}
