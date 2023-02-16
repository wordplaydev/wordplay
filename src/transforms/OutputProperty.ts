import type OutputPropertyRange from './OutputPropertyRange';
import type OutputPropertyOptions from './OutputPropertyOptions';
import type { OutputPropertyText } from './OutputExpression';
import type Expression from '@nodes/Expression';
import type Context from '@nodes/Context';
import type LanguageCode from '@translation/LanguageCode';

/** Represents an editable property on the output expression, with some optional information about valid property values */

type OutputProperty = {
    /** The internal name of the property, corresponding to bind input names of TypeOutput. */
    name: string;
    /** The type of input, roughly corresponding to widgets. */
    type:
        | OutputPropertyRange
        | OutputPropertyOptions
        | OutputPropertyText
        | 'color'
        | 'bool';
    /** True if the property uses the nearest parent's property if unset */
    inherited: boolean;
    /** A function that determines whether an Expression set on the property can be edited using the output editing controls. */
    editable: (expr: Expression, context: Context) => boolean;
    /** A function that produces an initial value for an unset property */
    create: (languages: LanguageCode[]) => Expression;
};

export default OutputProperty;
