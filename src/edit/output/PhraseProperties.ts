import {
    HorizontalLayout,
    VerticalLeftRightLayout,
    VerticalRightLeftLayout,
} from '@locale/Scripts';
import Evaluate from '@nodes/Evaluate';
import type Expression from '@nodes/Expression';
import FormattedLiteral from '@nodes/FormattedLiteral';
import Reference from '@nodes/Reference';
import TextLiteral from '@nodes/TextLiteral';
import type Project from '@db/projects/Project';
import type Locales from '@locale/Locales';
import type { NameText } from '@locale/LocaleText';
import Language from '@nodes/Language';
import NumberLiteral from '@nodes/NumberLiteral';
import Unit from '@nodes/Unit';
import { getTypeOutputProperties } from '@edit/output/OutputProperties';
import OutputProperty from '@edit/output/OutputProperty';
import OutputPropertyOptions from '@edit/output/OutputPropertyOptions';
import OutputPropertyRange from '@edit/output/OutputPropertyRange';
import OutputPropertyText from '@edit/output/OutputPropertyText';

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
    ];

    const typeProperties = getTypeOutputProperties(project, locales);

    // The font face makes more sense right next to the text, so we reorder it here.
    const faceIndex = typeProperties.findIndex(
        (prop) =>
            prop.getName(locales) ===
            locales.getUnannotatedText((l) => l.output.Phrase.face.names[0]),
    );
    if (faceIndex >= 0) {
        const faceProperty = typeProperties[faceIndex];
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
