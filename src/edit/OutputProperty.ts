import type OutputPropertyRange from './OutputPropertyRange';
import type OutputPropertyOptions from './OutputPropertyOptions';
import type OutputPropertyText from './OutputPropertyText';
import type Expression from '@nodes/Expression';
import type Context from '@nodes/Context';
import { getFirstName, type NameAndDoc } from '../locale/Locale';
import type Locales from '../locale/Locales';

type OutputPropertyType =
    | OutputPropertyRange
    | OutputPropertyOptions
    | OutputPropertyText
    | 'color'
    | 'bool'
    | 'pose'
    | 'poses'
    | 'content'
    | 'place'
    | 'aura'
    | 'form';

/** Represents an editable property on the output expression, with some optional information about valid property values */
class OutputProperty {
    /** The internal name of the property, corresponding to bind input names of TypeOutput. */
    readonly name: NameAndDoc;
    /** The type of input, roughly corresponding to widgets. */
    readonly type: OutputPropertyType;
    /** True if the property is required */
    readonly required: boolean;
    /** True if the property uses the nearest parent's property if unset */
    readonly inherited: boolean;
    /** A function that determines whether an Expression set on the property can be edited using the output editing controls. */
    readonly editable: (expr: Expression, context: Context) => boolean;
    /** A function that produces an initial value for an unset property */
    readonly create: (locales: Locales) => Expression;

    constructor(
        name: NameAndDoc,
        type: OutputPropertyType,
        required: boolean,
        inherited: boolean,
        editable: (expr: Expression, context: Context) => boolean,
        create: (locales: Locales) => Expression,
    ) {
        this.name = name;
        this.type = type;
        this.required = required;
        this.inherited = inherited;
        this.editable = editable;
        this.create = create;
    }

    getName() {
        return getFirstName(this.name.names);
    }
}

export default OutputProperty;
