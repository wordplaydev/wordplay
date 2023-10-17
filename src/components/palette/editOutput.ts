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
import FormattedLiteral from '../../nodes/FormattedLiteral';
import Convert from '../../nodes/Convert';
import TextType from '../../nodes/TextType';
import {
    GROUP_SYMBOL,
    PHRASE_SYMBOL,
    STAGE_SYMBOL,
} from '../../parser/Symbols';
import { toExpression } from '../../parser/parseExpression';
import { getPlaceExpression } from '../../output/getOrCreatePlace';
import type Spread from '../../nodes/Spread';
import type Locales from '../../locale/Locales';

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
    db: Database,
    project: Project,
    evaluates: Evaluate[],
    locales: Locales,
    horizontal: number,
    vertical: number,
    relative: boolean
) {
    const PlaceType = project.shares.output.Place;

    db.Projects.revise(
        project,
        evaluates.map((evaluate) => {
            const ctx = project.getNodeContext(evaluate);

            const given = getPlaceExpression(project, evaluate, ctx);
            const place =
                given instanceof Evaluate && given.is(PlaceType, ctx)
                    ? given
                    : undefined;

            const x = place?.getInput(
                project.shares.output.Place.inputs[0],
                ctx
            );
            const y = place?.getInput(
                project.shares.output.Place.inputs[1],
                ctx
            );
            const z = place?.getInput(
                project.shares.output.Place.inputs[2],
                ctx
            );

            const xValue = x instanceof Expression ? getNumber(x) : undefined;
            const yValue = y instanceof Expression ? getNumber(y) : undefined;
            const zValue = z instanceof Expression ? getNumber(z) : undefined;

            const bind = evaluate.is(project.shares.output.Phrase, ctx)
                ? project.shares.output.Phrase.inputs[3]
                : evaluate.is(project.shares.output.Group, ctx)
                ? project.shares.output.Phrase.inputs[4]
                : undefined;

            return [
                evaluate,
                bind === undefined
                    ? evaluate
                    : evaluate.withBindAs(
                          bind,
                          Evaluate.make(
                              Reference.make(
                                  locales.getName(PlaceType.names),
                                  PlaceType
                              ),
                              [
                                  // If coordinate is computed, and not a literal, don't change it.
                                  x instanceof Expression &&
                                  xValue === undefined
                                      ? x
                                      : NumberLiteral.make(
                                            relative
                                                ? new Decimal(xValue ?? 0)
                                                      .add(horizontal)
                                                      .toNumber()
                                                : horizontal,
                                            Unit.meters()
                                        ),
                                  y instanceof Expression &&
                                  yValue === undefined
                                      ? y
                                      : NumberLiteral.make(
                                            relative
                                                ? new Decimal(yValue ?? 0)
                                                      .add(vertical)
                                                      .toNumber()
                                                : vertical,
                                            Unit.meters()
                                        ),
                                  z instanceof Expression &&
                                  zValue !== undefined
                                      ? z
                                      : NumberLiteral.make(0, Unit.meters()),
                              ]
                          ),
                          ctx
                      ),
            ];
        })
    );
}

export function createPlaceholderPhrase(project: Project, locales: Locales) {
    const PhraseType = project.shares.output.Phrase;
    return Evaluate.make(Reference.make(locales.getName(PhraseType.names)), [
        TextLiteral.make(locales.get((l) => l.ui.phrases.welcome)),
    ]);
}

export function addContent(
    database: Database,
    project: Project,
    list: ListLiteral,
    index: number,
    kind: 'phrase' | 'group' | 'shape'
) {
    const GroupType = project.shares.output.Group;
    const RowType = project.shares.output.Row;
    const locales = database.Locales.getLocaleSet();
    reviseContent(database, project, list, [
        ...list.values.slice(0, index + 1),
        kind === 'phrase'
            ? // Create a placeholder phrase
              createPlaceholderPhrase(project, locales)
            : // Create a group with a Row layout and a single phrase
            kind === 'group'
            ? Evaluate.make(GroupType.getReference(locales), [
                  Evaluate.make(RowType.getReference(locales), []),
                  ListLiteral.make([createPlaceholderPhrase(project, locales)]),
              ])
            : // Create a placeholder shape
              Evaluate.make(project.shares.output.Shape.getReference(locales), [
                  Evaluate.make(
                      project.shares.output.Rectangle.getReference(locales),
                      [
                          NumberLiteral.make(-5, Unit.meters()),
                          NumberLiteral.make(0, Unit.meters()),
                          NumberLiteral.make(5, Unit.meters()),
                          NumberLiteral.make(-1, Unit.meters()),
                      ]
                  ),
              ]),
        ...list.values.slice(index + 1),
    ]);
}

export function reviseContent(
    db: Database,
    project: Project,
    list: ListLiteral,
    newValues: (Expression | Spread)[]
) {
    db.Projects.revise(project, [[list, ListLiteral.make(newValues)]]);
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
        content = createPlaceholderPhrase(
            project,
            database.Locales.getLocaleSet()
        );

    if (stage) {
        const context = project.getNodeContext(stage);
        const content = stage.getInput(StageType.inputs[0], context);
        if (content instanceof ListLiteral) {
            reviseContent(database, project, content, [
                ...content.values,
                content,
            ]);
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

export function addSoloPhrase(db: Database, project: Project) {
    // First, check if there's an existing phrase.
    let phrase = getSoloPhrase(project);
    if (phrase) return;

    // If there's not, find the last non-bind value of the program.
    const block = project.getMain().expression.expression;
    const statements = block.statements.filter(
        (node) => !(node instanceof Bind)
    );
    const last = statements.at(-1);

    const text =
        //Nothing? Use a welcome phrase.
        last === undefined
            ? TextLiteral.make(db.Locales.getLocale().ui.phrases.welcome)
            : // Already text or formatted? Just use it without modification.
            last instanceof TextLiteral || last instanceof FormattedLiteral
            ? last
            : // Something else? Convert it to text.
              Convert.make(last, TextType.make());

    // Build a new Phrase
    phrase = Evaluate.make(Reference.make(PHRASE_SYMBOL), [text]);

    db.Projects.reviseProject(
        project.withRevisedNodes([
            last ? [last, phrase] : [block, block.withStatement(phrase)],
        ])
    );
}

export function addGroup(db: Database, project: Project) {
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
    db.Projects.reviseProject(project.withRevisedNodes([[phrase, group]]));
}

export function addStage(
    db: Database,
    project: Project,
    existing: Evaluate | undefined
) {
    // Make sure there's not already a stage.
    let stage = getStage(project);
    if (stage !== undefined) return;

    // Build a new stage, wrapping the phrase.
    stage = Evaluate.make(Reference.make(STAGE_SYMBOL), [
        ListLiteral.make([
            existing ??
                createPlaceholderPhrase(project, db.Locales.getLocaleSet()),
        ]),
    ]);

    // Find the block to insert
    const block = project.getMain().expression.expression;

    // Replace the phrase with the group.
    db.Projects.reviseProject(
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
