import Evaluate from '../nodes/Evaluate';
import { ColorType, createColorLiteral } from '../output/Color';
import type OutputProperty from './OutputProperty';

const VerseProperties: OutputProperty[] = [
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
export default VerseProperties;
