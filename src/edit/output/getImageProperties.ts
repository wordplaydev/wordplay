import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import { getOutputProperties } from '@edit/output/OutputProperties';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyRange from '@edit/output/OutputPropertyRange';
import OutputPropertyText from '@edit/output/OutputPropertyText';
import TextLiteral from '@nodes/TextLiteral';

/**
 * What the palette offers for a picture.
 *
 * Its colors, and the two functions that translate them, are deliberately absent: a grid
 * of hundreds of colors and a function are not things a slider or a text field edits, and
 * offering a control that can only replace them wholesale would lose a creator's work. Its
 * size and its description are, and the description is here rather than among the shared
 * properties because a picture's is required and so leads its inputs.
 */
export default function getImageProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    return [
        new OutputProperty(
            (l) => l.output.Image.description.names,
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(''),
        ),
        new OutputProperty(
            (l) => l.output.Image.width.names,
            new OutputPropertyRange(1, 64, 0.5, 'm', 1),
            false,
            true,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(16, Unit.meters()),
        ),
        new OutputProperty(
            (l) => l.output.Image.height.names,
            new OutputPropertyRange(1, 64, 0.5, 'm', 1),
            false,
            true,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make(16, Unit.meters()),
        ),
        ...getOutputProperties(project, locales),
    ];
}
