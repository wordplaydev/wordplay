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
import type Locale from '../../locale/Locale';
import FormattedLiteral from '../../nodes/FormattedLiteral';
import Convert from '../../nodes/Convert';
import TextType from '../../nodes/TextType';
import {
    GROUP_SYMBOL,
    PHRASE_SYMBOL,
    STAGE_SYMBOL,
} from '../../parser/Symbols';

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

export function createPlaceholderPhrase(database: Database, project: Project) {
    const PhraseType = project.shares.output.Phrase;
    return Evaluate.make(
        Reference.make(
            PhraseType.names.getPreferredNameString(project.locales)
        ),
        [TextLiteral.make(project.locales[0].ui.phrases.welcome)]
    );
}

export function addContent(
    database: Database,
    project: Project,
    list: ListLiteral,
    index: number,
    phrase: boolean
) {
    const GroupType = project.shares.output.Group;
    const RowType = project.shares.output.Row;
    const newPhrase = createPlaceholderPhrase(database, project);
    reviseContent(database, project, list, [
        ...list.values.slice(0, index + 1),
        phrase
            ? newPhrase
            : // Create a group with a Row layout and a single phrase
              Evaluate.make(
                  Reference.make(
                      GroupType.names.getPreferredNameString(project.locales)
                  ),
                  [
                      Evaluate.make(
                          Reference.make(
                              RowType.names.getPreferredNameString(
                                  project.locales
                              )
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
    database: Database,
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
    reviseContent(database, project, list, newValues);
}

export function addStageContent(
    database: Database,
    project: Project,
    content: Expression | undefined
) {
    const StageType = project.shares.output.Stage;

    // Find the verse in the project.
    let stage: Evaluate | undefined = getStage(project);

    // If there is no stage, add an empty one.
    if (stage === undefined) {
        const newStage = toExpression(`Stage([])`);
        if (newStage instanceof Evaluate) {
            stage = newStage;
        }
    }

    if (content === undefined)
        content = createPlaceholderPhrase(database, project);

    if (stage) {
        const context = project.getNodeContext(stage);
        const list = stage.getExpressionFor(
            StageType.inputs[0].getNames()[0],
            context
        );
        if (list instanceof ListLiteral) {
            reviseContent(database, project, list, [...list.values, content]);
        }
    }
}

export function getStage(project: Project): Evaluate | undefined {
    const StageType = project.shares.output.Stage;

    for (const source of project.getSources()) {
        const context = project.getContext(source);
        const stage = source.expression.nodes(
            (node): node is Evaluate =>
                node instanceof Evaluate && node.is(StageType, context)
        )[0];
        if (stage) return stage;
    }
    return undefined;
}

export function getSoloPhrase(project: Project): Evaluate | undefined {
    const PhraseType = project.shares.output.Phrase;

    for (const source of project.getSources()) {
        const context = project.getContext(source);
        const phrase = source.expression.expression.statements.find(
            (n): n is Evaluate =>
                n instanceof Evaluate && n.is(PhraseType, context)
        );
        if (phrase) return phrase;
    }
    return undefined;
}

export function getSoloGroup(project: Project): Evaluate | undefined {
    const GroupType = project.shares.output.Group;

    for (const source of project.getSources()) {
        const context = project.getContext(source);
        const group = source.expression.expression.statements.find(
            (n): n is Evaluate =>
                n instanceof Evaluate && n.is(GroupType, context)
        );
        if (group) return group;
    }
    return undefined;
}

export function addSoloPhrase(database: Database, project: Project) {
    // First, check if there's an existing phrase.
    let phrase = getSoloPhrase(project);
    if (phrase) return;

    // If there's not, find the last non-bind value of the program.
    const block = project.main.expression.expression;
    const statements = block.statements.filter(
        (node) => !(node instanceof Bind)
    );
    const last = statements.at(-1);

    const text =
        //Nothing? Use a welcome phrase.
        last === undefined
            ? TextLiteral.make(database.getLocale().ui.phrases.welcome)
            : // Already text or formatted? Just use it without modification.
            last instanceof TextLiteral || last instanceof FormattedLiteral
            ? last
            : // Something else? Convert it to text.
              Convert.make(last, TextType.make());

    // Build a new Phrase
    phrase = Evaluate.make(Reference.make(PHRASE_SYMBOL), [text]);

    database.reviseProject(
        project,
        project.withRevisedNodes([
            last ? [last, phrase] : [block, block.withStatement(phrase)],
        ])
    );
}

export function addGroup(database: Database, project: Project) {
    // Find the solo phrase. If there isn't one, bail.
    const phrase = getSoloPhrase(project);
    if (phrase === undefined) return;

    // Build a new group, wrapping the phrase.
    const group = Evaluate.make(Reference.make(GROUP_SYMBOL), [
        Evaluate.make(
            Reference.make(project.shares.output.Stack.names.getNames()[0]),
            []
        ),
        ListLiteral.make([phrase]),
    ]);

    // Replace the phrase with the group.
    database.reviseProject(
        project,
        project.withRevisedNodes([[phrase, group]])
    );
}

export function addStage(
    database: Database,
    project: Project,
    existing: Evaluate | undefined
) {
    // Make sure there's not already a stage.
    let stage = getStage(project);
    if (stage !== undefined) return;

    // Build a new stage, wrapping the phrase.
    stage = Evaluate.make(Reference.make(STAGE_SYMBOL), [
        ListLiteral.make([
            existing ?? createPlaceholderPhrase(database, project),
        ]),
    ]);

    // Find the block to insert
    const block = project.main.expression.expression;

    // Replace the phrase with the group.
    database.reviseProject(
        project,
        project.withRevisedNodes([
            existing ? [existing, stage] : [block, block.withStatement(stage)],
        ])
    );
}

export function hasOutput(project: Project) {
    return project.getSources().some((source) => {
        const context = project.getContext(source);
        return source
            .nodes()
            .some(
                (n) =>
                    n instanceof Evaluate &&
                    (n.is(project.shares.output.Phrase, context) ||
                        n.is(project.shares.output.Group, context) ||
                        n.is(project.shares.output.Stage, context))
            );
    });
}
