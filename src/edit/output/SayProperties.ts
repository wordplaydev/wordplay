import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyText from '@edit/output/OutputPropertyText';
import FormattedLiteral from '@nodes/FormattedLiteral';
import Language from '@nodes/Language';
import TextLiteral from '@nodes/TextLiteral';

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
