import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import { getFirstText } from '../../locale/LocaleText';
import type Locales from '../../locale/Locales';
import type { LocaleTextsAccessor } from '../../locale/Locales';
import type OutputPropertyOptions from './OutputPropertyOptions';
import type OutputPropertyRange from './OutputPropertyRange';
import type OutputPropertyText from './OutputPropertyText';

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
    /** The accessor for getting the name or names of the property from a locale. */
    readonly name: LocaleTextsAccessor;
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
        name: LocaleTextsAccessor,
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

    getName(locales: Locales) {
        return getFirstText(locales.get(this.name));
    }

    isName(locales: Locales, accessor: LocaleTextsAccessor) {
        const thisNames = [locales.get(this.name)].flat();
        const thoseNames = [locales.get(accessor)].flat();
        return thisNames.filter((name) => thoseNames.includes(name)).length > 0;
    }
}

export default OutputProperty;
