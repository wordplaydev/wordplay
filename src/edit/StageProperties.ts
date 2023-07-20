import type Project from '../models/Project';
import Evaluate from '../nodes/Evaluate';
import ListLiteral from '../nodes/ListLiteral';
import { createColorLiteral } from '../output/Color';
import type OutputProperty from './OutputProperty';

export default function getStageProperties(project: Project): OutputProperty[] {
    return [
        {
            name: 'content',
            type: 'content',
            required: true,
            inherited: false,
            editable: (expr) => expr instanceof ListLiteral,
            create: () => ListLiteral.make([]),
        },
        {
            name: 'background',
            type: 'color' as const,
            required: false,
            inherited: false,
            editable: (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.color, context),
            create: (languages) =>
                createColorLiteral(project, languages, 0.5, 100, 180),
        },
    ];
}
