import {
    HorizontalLayout,
    VerticalLeftRightLayout,
    VerticalRightLeftLayout,
} from '#locale/Scripts.ts';
import Evaluate from '#nodes/Evaluate.ts';
import type Expression from '#nodes/Expression.ts';
import FormattedLiteral from '#nodes/FormattedLiteral.ts';
import Reference from '#nodes/Reference.ts';
import TextLiteral from '#nodes/TextLiteral.ts';
import type Project from '#db/projects/Project.ts';
import type Locales from '#locale/Locales.ts';
import type { NameText } from '#locale/LocaleText.ts';
import Language from '#nodes/Language.ts';
import NumberLiteral from '#nodes/NumberLiteral.ts';
import Unit from '#nodes/Unit.ts';
import { getTypeOutputProperties } from '#edit/output/OutputProperties.ts';
import OutputProperty from '#edit/output/OutputProperty.ts';
import OutputPropertyOptions from '#edit/output/OutputPropertyOptions.ts';
import OutputPropertyRange from '#edit/output/OutputPropertyRange.ts';
import OutputPropertyText from '#edit/output/OutputPropertyText.ts';

export default function getPhraseProperties(
    project: Project,
    locales: Locales,
): OutputProperty[] {
    let phraseProperties = [
        new OutputProperty(
            (l) => l.output.Phrase.text.names,
            new OutputPropertyText(() => true),
            true,
            false,
            (expr) =>
                expr instanceof TextLiteral || expr instanceof FormattedLiteral,
            (locales) =>
                TextLiteral.make('', Language.make(locales.getLanguages()[0])),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.wrap.names,
            new OutputPropertyRange(1, 30, 1, 'm'),
            false,
            false,
            (expr) => expr instanceof NumberLiteral,
            () => NumberLiteral.make('10', Unit.meters()),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.alignment.names,
            new OutputPropertyOptions(
                ['<', '|', '>'].map((v) => ({ value: v, label: v })),
                true,
                (text) => TextLiteral.make(text),
                (expr) =>
                    (expr instanceof TextLiteral ? expr.getText() : null) ??
                    '|',
            ),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make('|'),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.direction.names,
            new OutputPropertyOptions(
                [
                    HorizontalLayout,
                    VerticalRightLeftLayout,
                    VerticalLeftRightLayout,
                ].map((v) => ({ value: v, label: v })),
                false,
                (text) => TextLiteral.make(text),
                (expr) =>
                    (expr instanceof TextLiteral ? expr.getText() : null) ??
                    HorizontalLayout,
            ),
            false,
            false,
            (expr) => expr instanceof TextLiteral,
            () => TextLiteral.make(HorizontalLayout),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.aura.names,
            'structure',
            false,
            false,
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Aura, context),
            () =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Aura.names),
                        project.shares.output.Aura,
                    ),
                    [],
                ),
        ),
        new OutputProperty(
            (l) => l.output.Phrase.bubble.names,
            'structure',
            false,
            false,
            // Text and a `Say` are legal here too — they're the shorthand forms
            // — but the palette works in the structure, which is where the
            // side, kind, and colors live. A shorthand bubble is edited in code.
            (expr, context) =>
                expr instanceof Evaluate &&
                expr.is(project.shares.output.Bubble, context),
            () =>
                Evaluate.make(
                    Reference.make(
                        locales.getName(project.shares.output.Bubble.names),
                        project.shares.output.Bubble,
                    ),
                    [TextLiteral.make('')],
                ),
        ),
    ];

    const typeProperties = getTypeOutputProperties(project, locales);

    // The font face makes more sense right next to the text, so we reorder it here.
    const faceIndex = typeProperties.findIndex((prop) =>
        prop.isName(locales, (l) => l.output.Phrase.face.names),
    );
    const faceProperty = typeProperties[faceIndex];
    if (faceProperty !== undefined) {
        typeProperties.splice(faceIndex, 1);
        phraseProperties = [
            ...phraseProperties.slice(0, 1),
            faceProperty,
            ...phraseProperties.slice(1),
        ];
    }

    // The text change effect goes last, right after the duration and style
    // that pace it.
    const changingProperty = new OutputProperty(
        (l) => l.output.Phrase.changing.names,
        new OutputPropertyOptions(
            Object.values(locales.getTextStructure((l) => l.output.TextEffect))
                .reduce(
                    (all: string[], next: NameText) => [
                        ...all,
                        ...(Array.isArray(next) ? next : [next]),
                    ],
                    [],
                )
                .map((name) => ({ value: name, label: name })),
            // None means ø: the text changes instantly.
            true,
            (text: string) => TextLiteral.make(text),
            (expression: Expression | undefined) =>
                expression instanceof TextLiteral
                    ? expression.getValue(locales.getLocales()).text
                    : undefined,
        ),
        false,
        false,
        (expr) => expr instanceof TextLiteral,
        () =>
            TextLiteral.make(
                locales.getUnannotatedTexts((l) => l.output.TextEffect.edit)[0],
            ),
    );

    return [...phraseProperties, ...typeProperties, changingProperty];
}
