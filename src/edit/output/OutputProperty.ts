import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import { getFirstText } from '@locale/LocaleText';
import type Locales from '@locale/Locales';
import type { LocaleTextsAccessor } from '@locale/Locales';
import type OutputPropertyNumber from '@edit/output/OutputPropertyNumber';
import type OutputPropertyOptions from '@edit/output/OutputPropertyOptions';
import type OutputPropertyRange from '@edit/output/OutputPropertyRange';
import type OutputPropertyText from '@edit/output/OutputPropertyText';

type OutputPropertyType =
    | OutputPropertyRange
    | OutputPropertyNumber
    | OutputPropertyOptions
    | OutputPropertyText
    | 'color'
    | 'bool'
    | 'pose'
    | 'poses'
    | 'content'
    | 'place'
    | 'arrangement'
    | 'structure';

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
    /**
     * When true, the property's control is always rendered (seeded with its default), instead of
     * showing a read-only "default" note until explicitly set. Used by editors like Place,
     * Velocity, and Aura that have always-editable inputs seeded with sensible defaults.
     */
    readonly inline: boolean;

    constructor(
        name: LocaleTextsAccessor,
        type: OutputPropertyType,
        required: boolean,
        inherited: boolean,
        editable: (expr: Expression, context: Context) => boolean,
        create: (locales: Locales) => Expression,
        inline = false,
    ) {
        this.name = name;
        this.type = type;
        this.required = required;
        this.inherited = inherited;
        this.editable = editable;
        this.create = create;
        this.inline = inline;
    }

    getName(locales: Locales) {
        return getFirstText(locales.getUnannotatedTexts(this.name));
    }

    isName(locales: Locales, accessor: LocaleTextsAccessor) {
        const thisNames = [locales.getUnannotatedTexts(this.name)].flat();
        const thoseNames = [locales.getUnannotatedTexts(accessor)].flat();
        return thisNames.filter((name) => thoseNames.includes(name)).length > 0;
    }
}

export default OutputProperty;
