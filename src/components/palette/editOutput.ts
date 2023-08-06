import Evaluate from '@nodes/Evaluate';
import type Project from '@models/Project';
import Bind from '@nodes/Bind';
import Expression from '@nodes/Expression';
import NumberLiteral from '@nodes/NumberLiteral';
import Reference from '@nodes/Reference';
import Unit from '@nodes/Unit';
import type { Database } from '../../db/Database';
import UnaryEvaluate from '../../nodes/UnaryEvaluate';
import Decimal from 'decimal.js';
import TextLiteral from '../../nodes/TextLiteral';
import ListLiteral from '../../nodes/ListLiteral';
import { toExpression } from '../../parser/Parser';
import { config } from '../../db/Database';
import { get } from 'svelte/store';
import type Locale from '../../locale/Locale';

export function getNumber(given: Expression): number | undefined {
    const measurement =
        given instanceof NumberLiteral
            ? given
            : given instanceof Bind && given.value instanceof NumberLiteral
            ? given.value
            : given instanceof UnaryEvaluate &&
              given.isNegation() &&
              given.input instanceof NumberLiteral
            ? given.input
            : undefined;
    return measurement
        ? (given instanceof UnaryEvaluate && given.isNegation() ? -1 : 1) *
              measurement.getValue().num.toNumber()
        : undefined;
}

export default function moveOutput(
    projects: Database,
    project: Project,
    evaluates: Evaluate[],
    locales: Locale[],
    horizontal: number,
    vertical: number,
    relative: boolean
) {
    const PlaceType = project.shares.output.Place;

    projects.reviseProjectNodes(
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

            const xValue = x instanceof Expression ? getNumber(x) : undefined;
            const yValue = y instanceof Expression ? getNumber(y) : undefined;
            const zValue = z instanceof Expression ? getNumber(z) : undefined;

            return [
                evaluate,
                evaluate.withBindAs(
                    'place',
                    Evaluate.make(
                        Reference.make(
                            PlaceType.names.getPreferredNameString(locales),
                            PlaceType
                        ),
                        [
                            // If coordinate is computed, and not a literal, don't change it.
                            x instanceof Expression && xValue === undefined
                                ? x
                                : NumberLiteral.make(
                                      relative
                                          ? new Decimal(xValue ?? 0)
                                                .add(horizontal)
                                                .toNumber()
                                          : horizontal,
                                      Unit.create(['m'])
                                  ),
                            y instanceof Expression && yValue === undefined
                                ? y
                                : NumberLiteral.make(
                                      relative
                                          ? new Decimal(yValue ?? 0)
                                                .add(vertical)
                                                .toNumber()
                                          : vertical,
                                      Unit.create(['m'])
                                  ),
                            z instanceof Expression && zValue !== undefined
                                ? z
                                : NumberLiteral.make(0, Unit.create(['m'])),
                        ]
                    ),
                    ctx
                ),
            ];
        })
    );
}

export function addContent(
    projects: Database,
    project: Project,
    list: ListLiteral,
    index: number,
    phrase: boolean
) {
    const PhraseType = project.shares.output.Phrase;
    const GroupType = project.shares.output.Group;
    const RowType = project.shares.output.Row;
    const locales = get(config).getLocales();
    const newPhrase = Evaluate.make(
        Reference.make(PhraseType.names.getPreferredNameString(locales)),
        [TextLiteral.make(get(config).getLocale().ui.phrases.welcome)]
    );
    reviseContent(projects, project, list, [
        ...list.values.slice(0, index + 1),
        phrase
            ? newPhrase
            : // Create a group with a Row layout and a single phrase
              Evaluate.make(
                  Reference.make(
                      GroupType.names.getPreferredNameString(locales)
                  ),
                  [
                      Evaluate.make(
                          Reference.make(
                              RowType.names.getPreferredNameString(locales)
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
    projects: Database,
    project: Project,
    list: ListLiteral,
    newValues: Expression[]
) {
    projects.reviseProjectNodes(project, [[list, ListLiteral.make(newValues)]]);
}

export function removeContent(
    projects: Database,
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
    projects: Database,
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

export function addStageContent(
    projects: Database,
    project: Project,
    content: Expression
) {
    const StageType = project.shares.output.Stage;

    // Find the verse in the project.
    let verse: Evaluate | undefined = getStage(project);

    // If there is no verse, add an empty one.
    if (verse === undefined) {
        const newStage = toExpression(`Stage([])`);
        if (newStage instanceof Evaluate) verse = newStage;
    }

    if (verse) {
        const context = project.getNodeContext(verse);
        const list = verse.getExpressionFor(
            StageType.inputs[0].getNames()[0],
            context
        );
        if (list instanceof ListLiteral) {
            reviseContent(projects, project, list, [...list.values, content]);
        }
    }
}

export function getStage(project: Project): Evaluate | undefined {
    const StageType = project.shares.output.Stage;

    for (const source of project.getSources()) {
        const context = project.getContext(source);
        const verse = source.expression
            .nodes()
            .find(
                (n): n is Evaluate =>
                    n instanceof Evaluate && n.is(StageType, context)
            );
        if (verse) return verse;
    }
    return undefined;
}
