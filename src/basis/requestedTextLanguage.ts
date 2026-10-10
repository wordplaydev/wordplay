import Convert from '#nodes/Convert.ts';
import type Language from '#nodes/Language.ts';
import TextType from '#nodes/TextType.ts';
import type Evaluation from '#runtime/Evaluation.ts';

/**
 * The language a `→ ''/hi-IN` conversion asked for, if the conversion being evaluated named one.
 * A tag on the target text type is a rendering request (#1196), which every conversion to text
 * has to honor, not only the number one, or a number in a union type renders in the wrong digits.
 */
export default function requestedTextLanguage(
    evaluation: Evaluation,
): Language | undefined {
    const creator = evaluation.getCreator();
    return creator instanceof Convert && creator.type instanceof TextType
        ? creator.type.concreteLanguage(evaluation.getContext())
        : undefined;
}
