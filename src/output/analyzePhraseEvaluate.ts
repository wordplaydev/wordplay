import { Faces, faceSupportsWeight, type SupportedFace } from '@basis/Fonts';
import UnsupportedFontFormat from '@conflicts/UnsupportedFontFormat';
import type Conflict from '@conflicts/Conflict';
import type Context from '@nodes/Context';
import type Evaluate from '@nodes/Evaluate';
import TextLiteral from '@nodes/TextLiteral';
import Words from '@nodes/Words';
import FormattedLiteral from '@nodes/FormattedLiteral';

/**
 * Static analysis: warn when a @Phrase's markup requests a weight or italic
 * style that the chosen face doesn't ship. Only runs when both `face` and the
 * markup are statically determinable.
 */
export default function analyzePhraseEvaluate(
    evaluate: Evaluate,
    context: Context,
): Conflict[] {
    const project = context.project;
    const Phrase = project.shares.output.Phrase;

    // Phrase.inputs = [text, size, face, ...] — see createPhraseType.
    const textInput = evaluate.getInput(Phrase.inputs[0], context);
    const faceInput = evaluate.getInput(Phrase.inputs[2], context);

    // We can only diagnose when text is a FormattedLiteral and face is a TextLiteral.
    if (!(textInput instanceof FormattedLiteral)) return [];
    if (!(faceInput instanceof TextLiteral)) return [];

    const faceName = faceInput
        .getValue(project.basis.locales.getLocales())
        .text.trim();
    if (faceName === '') return [];

    const face = (Faces as Record<string, (typeof Faces)[SupportedFace]>)[
        faceName
    ];
    if (face === undefined) return [];

    const locales = project.basis.locales;
    const conflicts: Conflict[] = [];

    for (const translation of textInput.texts) {
        for (const node of translation.markup.nodes()) {
            if (!(node instanceof Words)) continue;

            const weight = node.getWeight();
            const format = node.getFormat();

            // Weight ≠ 400 means the markup is explicitly requesting a weight,
            // e.g. light/bold/extra. Default 400 is always supported (else the
            // face would not be loadable at all).
            if (weight !== undefined && weight !== 400) {
                if (!faceSupportsWeight(face, weight)) {
                    const formatLabel = locales.getPlainText(
                        weight === 300
                            ? (l) => l.ui.palette.labels.light
                            : weight === 700
                              ? (l) => l.ui.palette.labels.bold
                              : (l) => l.ui.palette.labels.extra,
                    );
                    conflicts.push(
                        new UnsupportedFontFormat(node, faceName, formatLabel),
                    );
                }
            }

            if (format === 'italic' && !face.italic) {
                conflicts.push(
                    new UnsupportedFontFormat(
                        node,
                        faceName,
                        locales.getPlainText((l) => l.ui.palette.labels.italic),
                    ),
                );
            }
        }
    }

    return conflicts;
}
