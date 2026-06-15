import { getDocLocales } from '@locale/getDocLocales';
import { getNameLocales } from '@locale/getNameLocales';
import Block, { BlockKind } from '@nodes/Block';
import BooleanType from '@nodes/BooleanType';
import type Expression from '@nodes/Expression';
import FormattedType from '@nodes/FormattedType';
import Language from '@nodes/Language';
import Markup from '@nodes/Markup';
import NumberType from '@nodes/NumberType';
import StructureDefinition from '@nodes/StructureDefinition';
import TextType from '@nodes/TextType';
import type BoolValue from '@values/BoolValue';
import MarkupValue from '@values/MarkupValue';
import NumberValue from '@values/NumberValue';
import TextValue from '@values/TextValue';
import type Value from '@values/Value';
import type Locales from '@locale/Locales';
import type LocaleText from '@locale/LocaleText';
import type { FunctionText, NameAndDoc } from '@locale/LocaleText';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '@basis/Basis';

const MAX_TEXT_LENGTH = 65536;

export default function bootstrapFormatted(locales: Locales) {
    /** A function taking a plain-text query argument and returning a boolean. */
    function createTextQueryFunction(
        functionText: (locale: LocaleText) => FunctionText<NameAndDoc[]>,
        fun: (
            requestor: Expression,
            markup: MarkupValue,
            input: TextValue,
        ) => BoolValue,
    ) {
        return createBasisFunction(
            locales,
            functionText,
            undefined,
            [TextType.make()],
            BooleanType.make(),
            (requestor, evaluation) => {
                const markup = evaluation.getClosure();
                const input = evaluation.getInput(0);
                if (!(markup instanceof MarkupValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        FormattedType.make(),
                        markup,
                    );
                if (input === undefined || !(input instanceof TextValue))
                    return evaluation.getValueOrTypeException(
                        requestor,
                        TextType.make(),
                        input,
                    );
                return fun(requestor, markup, input);
            },
        );
    }

    return StructureDefinition.make(
        getDocLocales(locales, (locale) => locale.basis.Formatted.doc),
        getNameLocales(locales, (locale) => locale.basis.Formatted.name),
        [],
        undefined,
        [],
        new Block(
            [
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.length,
                    undefined,
                    [],
                    NumberType.make(),
                    (requestor, evaluation) => {
                        const markup = evaluation.getClosure();
                        if (!(markup instanceof MarkupValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                FormattedType.make(),
                                markup,
                            );
                        return markup.length(requestor);
                    },
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.equals,
                    true,
                ),
                createEqualsFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.notequals,
                    false,
                ),
                createTextQueryFunction(
                    (locale) => locale.basis.Formatted.function.has,
                    (requestor, markup, input) => markup.has(requestor, input),
                ),
                createTextQueryFunction(
                    (locale) => locale.basis.Formatted.function.starts,
                    (requestor, markup, input) =>
                        markup.starts(requestor, input),
                ),
                createTextQueryFunction(
                    (locale) => locale.basis.Formatted.function.ends,
                    (requestor, markup, input) => markup.ends(requestor, input),
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.repeat,
                    undefined,
                    [NumberType.make()],
                    FormattedType.make(),
                    (requestor, evaluation) => {
                        const markup = evaluation.getClosure();
                        const count = evaluation.getInput(0);
                        if (!(markup instanceof MarkupValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                FormattedType.make(),
                                markup,
                            );
                        if (
                            count === undefined ||
                            !(count instanceof NumberValue)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                NumberType.make(),
                                count,
                            );
                        const length = markup.markup.toText().length;
                        const desired = count.num.toNumber();
                        const actual =
                            length * desired > MAX_TEXT_LENGTH
                                ? Math.floor(MAX_TEXT_LENGTH / length)
                                : desired;
                        return markup.repeat(
                            requestor,
                            Math.max(0, Math.floor(actual)),
                        );
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.combine,
                    undefined,
                    [FormattedType.make()],
                    // Result locale is the union of the operands' locales.
                    FormattedType.make((left, right) =>
                        Language.union(left, right),
                    ),
                    (requestor, evaluation) => {
                        const markup = evaluation.getClosure();
                        const other = evaluation.getInput(0);
                        if (!(markup instanceof MarkupValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                FormattedType.make(),
                                markup,
                            );
                        if (
                            other === undefined ||
                            !(other instanceof MarkupValue)
                        )
                            return evaluation.getValueOrTypeException(
                                requestor,
                                FormattedType.make(),
                                other,
                            );
                        return markup.combine(requestor, other);
                    },
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Formatted.conversion.text,
                    ),
                    FormattedType.make(),
                    TextType.make(),
                    // Strips all markup (bold, italic, links, …) via toText(),
                    // keeping only the plain text and the locale.
                    (requestor: Expression, val: MarkupValue) =>
                        new TextValue(
                            requestor,
                            val.markup.toText(),
                            val.language,
                        ),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}

/** Wrap a text value's text as a formatted (markup) value, carrying its locale.
 *  Used by the Text → Formatted conversion registered in TextBasis. */
export function textToFormatted(
    requestor: Expression,
    val: TextValue,
): Value {
    return new MarkupValue(requestor, Markup.words(val.text), val.language);
}
