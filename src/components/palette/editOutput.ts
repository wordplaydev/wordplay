import Evaluate from '@nodes/Evaluate';
import type Project from '@models/Project';
import Bind from '@nodes/Bind';
import Expression from '@nodes/Expression';
import MeasurementLiteral from '@nodes/MeasurementLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import { PlaceType } from '@output/Place';
import type LanguageCode from '@translation/LanguageCode';
import type Projects from '../../db/Projects';
import UnaryOperation from '../../nodes/UnaryOperation';
import Decimal from 'decimal.js';
import { PhraseType } from '../../output/Phrase';
import TextLiteral from '../../nodes/TextLiteral';
import ListLiteral from '../../nodes/ListLiteral';
import { GroupType } from '../../output/Group';
import { RowType } from '../../output/Row';
import { getLanguages } from '../../translation/locales';
import { getLocale } from '../../translation/locales';
import { VerseType } from '../../output/Verse';
import { toExpression } from '../../parser/Parser';

export function getMeasurement(given: Expression): number | undefined {
    const measurement =
        given instanceof MeasurementLiteral
            ? given
            : given instanceof Bind && given.value instanceof MeasurementLiteral
            ? given.value
            : given instanceof UnaryOperation &&
              given.isNegation() &&
              given.operand instanceof MeasurementLiteral
            ? given.operand
            : undefined;
    return measurement
        ? (given instanceof UnaryOperation && given.isNegation() ? -1 : 1) *
              measurement.getValue().num.toNumber()
        : undefined;
}

export default function moveOutput(
    projects: Projects,
    project: Project,
    evaluates: Evaluate[],
    languages: LanguageCode[],
    horizontal: number,
    vertical: number,
    relative: boolean
) {
    projects.reviseNodes(
        project,
        evaluates.map((evaluate) => {
            const ctx = project.getNodeContext(evaluate);

            const given = evaluate.getMappingFor('place', ctx);
            const place =
                given &&
                given.given instanceof Evaluate &&
                given.given.is(PlaceType, ctx)
                    ? given.given
                    : given &&
                      given.given instanceof Bind &&
                      given.given.value instanceof Evaluate &&
                      given.given.value.is(PlaceType, ctx)
                    ? given.given.value
                    : undefined;

            const x = place?.getMappingFor('x', ctx)?.given;
            const y = place?.getMappingFor('y', ctx)?.given;
            const z = place?.getMappingFor('z', ctx)?.given;

            const xValue =
                x instanceof Expression ? getMeasurement(x) : undefined;
            const yValue =
                y instanceof Expression ? getMeasurement(y) : undefined;
            const zValue =
                z instanceof Expression ? getMeasurement(z) : undefined;

            return [
                evaluate,
                evaluate.withBindAs(
                    'place',
                    Evaluate.make(
                        Reference.make(
                            PlaceType.names.getLocaleText(languages),
                            PlaceType
                        ),
                        [
                            // If coordinate is computed, and not a literal, don't change it.
                            x instanceof Expression && xValue === undefined
                                ? x
                                : MeasurementLiteral.make(
                                      relative
                                          ? new Decimal(xValue ?? 0)
                                                .add(horizontal)
                                                .toNumber()
                                          : horizontal,
                                      Unit.make(['m'])
                                  ),
                            y instanceof Expression && yValue === undefined
                                ? y
                                : MeasurementLiteral.make(
                                      relative
                                          ? new Decimal(yValue ?? 0)
                                                .add(vertical)
                                                .toNumber()
                                          : vertical,
                                      Unit.make(['m'])
                                  ),
                            z instanceof Expression && zValue !== undefined
                                ? z
                                : MeasurementLiteral.make(0, Unit.make(['m'])),
                        ]
                    ),
                    ctx
                ),
            ];
        })
    );
}

export function addContent(
    projects: Projects,
    project: Project,
    list: ListLiteral,
    index: number,
    phrase: boolean
) {
    const languages = getLanguages();
    const newPhrase = Evaluate.make(
        Reference.make(PhraseType.names.getLocaleText(getLanguages())),
        [TextLiteral.make(getLocale().welcome)]
    );
    reviseContent(projects, project, list, [
        ...list.values.slice(0, index + 1),
        phrase
            ? newPhrase
            : // Create a group with a Row layout and a single phrase
              Evaluate.make(
                  Reference.make(GroupType.names.getLocaleText(languages)),
                  [
                      Evaluate.make(
                          Reference.make(
                              RowType.names.getLocaleText(languages)
                          ),
                          []
                      ),
                      ListLiteral.make([newPhrase]),
                  ]
              ),
        ...list.values.slice(index + 1),
    ]);
}

export function reviseContent(
    projects: Projects,
    project: Project,
    list: ListLiteral,
    newValues: Expression[]
) {
    projects.reviseNodes(project, [[list, ListLiteral.make(newValues)]]);
}

export function removeContent(
    projects: Projects,
    project: Project,
    list: ListLiteral,
    index: number
) {
    if (list === undefined) return;
    reviseContent(projects, project, list, [
        ...list.values.slice(0, index),
        ...list.values.slice(index + 1),
    ]);
}

export function moveContent(
    projects: Projects,
    project: Project,
    list: ListLiteral,
    index: number,
    direction: 1 | -1
) {
    if (list === undefined) return;
    const content = list.values[index];
    if (content === undefined) return;
    const newValues = list.values.slice();
    if (direction < 0) {
        const previous = newValues[index - 1];
        newValues[index - 1] = content;
        newValues[index] = previous;
    } else {
        const next = newValues[index + 1];
        newValues[index + 1] = content;
        newValues[index] = next;
    }
    reviseContent(projects, project, list, newValues);
}

export function addVerseContent(
    projects: Projects,
    project: Project,
    content: Expression
) {
    // Find the verse in the project.
    let verse: Evaluate | undefined = getVerse(project);

    // If there is no verse, add an empty one.
    if (verse === undefined) {
        const newVerse = toExpression(`Verse([])`);
        if (newVerse instanceof Evaluate) verse = newVerse;
    }

    if (verse) {
        const context = project.getNodeContext(verse);
        const list = verse.getExpressionFor(
            VerseType.inputs[0].getNames()[0],
            context
        );
        if (list instanceof ListLiteral) {
            reviseContent(projects, project, list, [...list.values, content]);
        }
    }
}

export function getVerse(project: Project): Evaluate | undefined {
    for (const source of project.getSources()) {
        const context = project.getContext(source);
        const verse = source.expression
            .nodes()
            .find(
                (n): n is Evaluate =>
                    n instanceof Evaluate && n.is(VerseType, context)
            );
        if (verse) return verse;
    }
    return undefined;
}
