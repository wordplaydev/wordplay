import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyText from '#edit/output/OutputPropertyText.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import Language from '#nodes/Language.ts';
import TextLiteral from '#nodes/TextLiteral.ts';

/**
 * A `Say` has exactly one input, the text it speaks — no size, place, or pose,
 * since it is heard rather than seen. The palette showed nothing at all for one
 * before, which reads as a broken tile rather than as "there is one thing here".
 */
export default function getSayProperties(
    _project: Project,
    _locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Say.text.names,
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) =>
                expr instanceof TextLiteral || expr instanceof FormattedLiteral,
            (locales) =>
                TextLiteral.make('', Language.make(locales.getLanguages()[0])),
        ),
    ];
}
