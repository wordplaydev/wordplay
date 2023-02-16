import type OutputPropertyRange from './OutputPropertyRange';
import type OutputPropertyOptions from './OutputPropertyOptions';
import type { OutputPropertyText } from './OutputExpression';

/** Represents an editable property on the output expression, with some optional information about valid property values */

type OutputProperty = {
    name: string;
    type:
        | OutputPropertyRange
        | OutputPropertyOptions
        | OutputPropertyText
        | 'color'
        | 'bool';
    required: boolean;
};

export default OutputProperty;
