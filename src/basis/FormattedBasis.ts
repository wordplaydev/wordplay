import { getDocLocales } from '#locale/getDocLocales.ts';
import { getNameLocales } from '#locale/getNameLocales.ts';
import Block, { BlockKind } from '#nodes/Block.ts';
import BooleanType from '#nodes/BooleanType.ts';
import type Expression from '#nodes/Expression.ts';
import FormattedType from '#nodes/FormattedType.ts';
import Language from '#nodes/Language.ts';
import Markup from '#nodes/Markup.ts';
import NumberType from '#nodes/NumberType.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import TextType from '#nodes/TextType.ts';
import type BoolValue from '#values/BoolValue.ts';
import MarkupValue from '#values/MarkupValue.ts';
import NumberValue from '#values/NumberValue.ts';
import ListType from '#nodes/ListType.ts';
import ListValue from '#values/ListValue.ts';
import UnicodeString from '#unicode/UnicodeString.ts';
import TextValue from '#values/TextValue.ts';
import type Value from '#values/Value.ts';
import type Locales from '#locale/Locales.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { FunctionText, NameAndDoc } from '#locale/LocaleText.ts';
import {
    createBasisConversion,
    createBasisFunction,
    createEqualsFunction,
} from '#basis/Basis.ts';

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
                // Case conversion converts only the prose, and takes its
                // locale from the receiver's own tag, mirroring text.
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.uppercase,
                    undefined,
                    [],
                    FormattedType.make((left) => left),
                    (requestor, evaluation) => {
                        const markup = evaluation.getClosure();
                        if (!(markup instanceof MarkupValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                FormattedType.make(),
                                markup,
                            );
                        return markup.uppercase(requestor);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.lowercase,
                    undefined,
                    [],
                    FormattedType.make((left) => left),
                    (requestor, evaluation) => {
                        const markup = evaluation.getClosure();
                        if (!(markup instanceof MarkupValue))
                            return evaluation.getValueOrTypeException(
                                requestor,
                                FormattedType.make(),
                                markup,
                            );
                        return markup.lowercase(requestor);
                    },
                ),
                createBasisFunction(
                    locales,
                    (locale) => locale.basis.Formatted.function.repeat,
                    undefined,
                    [NumberType.make()],
                    // Repeating keeps the source's locale, so say so.
                    FormattedType.make((left) => left),
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
                    MarkupValue,
                    // Strips all markup (bold, italic, links, …) via toText(),
                    // keeping only the plain text and the locale.
                    (requestor: Expression, val: MarkupValue) =>
                        new TextValue(
                            requestor,
                            val.markup.toText(),
                            val.language,
                        ),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Formatted.conversion.list,
                    ),
                    FormattedType.make(),
                    ListType.make(TextType.make()),
                    MarkupValue,
                    // The plain text split by grapheme, mirroring Text → [''].
                    // Formatting can't survive being cut into single symbols.
                    (requestor: Expression, val: MarkupValue) =>
                        new ListValue(
                            requestor,
                            new UnicodeString(val.markup.getPlainText())
                                .getGraphemes()
                                .map(
                                    (g) =>
                                        new TextValue(
                                            requestor,
                                            g,
                                            val.language,
                                        ),
                                ),
                        ),
                ),
                createBasisConversion(
                    getDocLocales(
                        locales,
                        (locale) => locale.basis.Formatted.conversion.number,
                    ),
                    FormattedType.make(),
                    NumberType.make(),
                    MarkupValue,
                    (requestor: Expression, val: MarkupValue) =>
                        new NumberValue(requestor, val.markup.getPlainText()),
                ),
            ],
            BlockKind.Structure,
        ),
    );
}

/** Wrap a text value's text as a formatted (markup) value, carrying its locale.
 *  Used by the Text → Formatted conversion registered in TextBasis. */
export function textToFormatted(requestor: Expression, val: TextValue): Value {
    return new MarkupValue(requestor, Markup.words(val.text), val.language);
}
