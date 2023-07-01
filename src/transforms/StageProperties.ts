import Evaluate from '../nodes/Evaluate';
import ListLiteral from '../nodes/ListLiteral';
import { ColorType, createColorLiteral } from '../output/Color';
import type OutputProperty from './OutputProperty';

const StageProperties: OutputProperty[] = [
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
            expr instanceof Evaluate && expr.is(ColorType, context),
        create: (languages) => createColorLiteral(languages, 0.5, 100, 180),
    },
];
export default StageProperties;
