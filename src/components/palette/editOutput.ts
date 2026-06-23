import type Project from '@db/projects/Project';
import Block from '@nodes/Block';
import type Context from '@nodes/Context';
import Evaluate from '@nodes/Evaluate';
import Expression from '@nodes/Expression';
import FormattedType from '@nodes/FormattedType';
import Input from '@nodes/Input';
import Node from '@nodes/Node';
import NumberLiteral from '@nodes/NumberLiteral';
import Reference from '@nodes/Reference';
import StructureType from '@nodes/StructureType';
import type Type from '@nodes/Type';
import UnionType from '@nodes/UnionType';
import Unit from '@nodes/Unit';
import Decimal from 'decimal.js';
import type { Database } from '@db/Database';
import type Locales from '@locale/Locales';
import Convert from '@nodes/Convert';
import FormattedLiteral from '@nodes/FormattedLiteral';
import ListLiteral from '@nodes/ListLiteral';
import ListType from '@nodes/ListType';
import type Spread from '@nodes/Spread';
import TextLiteral from '@nodes/TextLiteral';
import TextType from '@nodes/TextType';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import { getPlaceExpression } from '@output/getOrCreatePlace';
import { getFormAnchor, translateFormTo } from '@edit/output/editShape';
import { PHRASE_SYMBOL } from '@parser/Symbols';

export function getNumber(given: Expression): number | undefined {
    const measurement =
        given instanceof NumberLiteral
            ? given
            : given instanceof Input && given.value instanceof NumberLiteral
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
    relative: boolean,
) {
    const PlaceType = project.shares.output.Place;

    db.Projects.revise(
        project,
        evaluates.map((evaluate) => {
            const ctx = project.getNodeContext(evaluate);

            // Shapes have no place; move them by translating their form's anchor (its
            // Rectangle edges or Circle/Polygon center) to the target stage position.
            const ShapeType = project.shares.output.Shape;
            if (evaluate.is(ShapeType, ctx)) {
                const form = evaluate.getInput(ShapeType.inputs[0], ctx);
                const anchor =
                    form instanceof Evaluate
                        ? getFormAnchor(project, form, ctx)
                        : undefined;
                const newForm =
                    form instanceof Evaluate && anchor
                        ? translateFormTo(
                              project,
                              form,
                              ctx,
                              relative ? anchor.x + horizontal : horizontal,
                              relative ? anchor.y + vertical : vertical,
                          )
                        : undefined;
                return [
                    evaluate,
                    newForm
                        ? evaluate.withBindAs(ShapeType.inputs[0], newForm, ctx)
                        : evaluate,
                ];
            }

            const given = getPlaceExpression(project, evaluate, ctx);
            const place =
                given instanceof Evaluate && given.is(PlaceType, ctx)
                    ? given
                    : undefined;

            const x = place?.getInput(
                project.shares.output.Place.inputs[0],
                ctx,
            );
            const y = place?.getInput(
                project.shares.output.Place.inputs[1],
                ctx,
            );
            const z = place?.getInput(
                project.shares.output.Place.inputs[2],
                ctx,
            );

            const xValue = x instanceof Expression ? getNumber(x) : undefined;
            const yValue = y instanceof Expression ? getNumber(y) : undefined;
            const zValue = z instanceof Expression ? getNumber(z) : undefined;

            const bind = evaluate.is(project.shares.output.Phrase, ctx)
                ? project.shares.output.Phrase.inputs[3]
                : evaluate.is(project.shares.output.Group, ctx)
                  ? project.shares.output.Group.inputs[4]
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
                                  PlaceType,
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
                                            Unit.meters(),
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
                                            Unit.meters(),
                                        ),
                                  z instanceof Expression &&
                                  zValue !== undefined
                                      ? z
                                      : NumberLiteral.make(0, Unit.meters()),
                              ],
                          ),
                          ctx,
                      ),
            ];
        }),
    );
}

export function createPlaceholderPhrase(project: Project, locales: Locales) {
    const PhraseType = project.shares.output.Phrase;
    return Evaluate.make(Reference.make(locales.getName(PhraseType.names)), [
        TextLiteral.make(
            locales.getUnannotatedText((l) => l.ui.phrases.welcome),
        ),
    ]);
}

/** A placeholder Shape wrapping a default Rectangle, used when creating a shape from scratch. */
export function createPlaceholderShape(project: Project, locales: Locales) {
    return Evaluate.make(project.shares.output.Shape.getReference(locales), [
        Evaluate.make(project.shares.output.Rectangle.getReference(locales), [
            NumberLiteral.make(-5, Unit.meters()),
            NumberLiteral.make(0, Unit.meters()),
            NumberLiteral.make(5, Unit.meters()),
            NumberLiteral.make(-1, Unit.meters()),
        ]),
    ]);
}

export function addContent(
    database: Database,
    project: Project,
    list: ListLiteral,
    index: number,
    kind: 'phrase' | 'group' | 'shape',
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
                    ListLiteral.make([
                        createPlaceholderPhrase(project, locales),
                    ]),
                ])
              : // Create a placeholder shape
                createPlaceholderShape(project, locales),
        ...list.values.slice(index + 1),
    ]);
}

export function reviseContent(
    db: Database,
    project: Project,
    list: ListLiteral,
    newValues: (Expression | Spread)[],
) {
    db.Projects.revise(project, [[list, ListLiteral.make(newValues)]]);
}

export function removeContent(
    projects: Database,
    project: Project,
    list: ListLiteral,
    index: number,
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
    direction: 1 | -1,
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
    content: Expression | undefined,
) {
    const StageType = project.shares.output.Stage;
    const locales = database.Locales.getLocaleSet();
    const newContent = content ?? createPlaceholderPhrase(project, locales);

    const stage = getStage(project);
    if (stage) {
        // Append the new content to the stage's content list.
        const context = project.getNodeContext(stage);
        const list = stage.getInput(StageType.inputs[0], context);
        if (list instanceof ListLiteral)
            reviseContent(database, project, list, [
                ...list.values,
                newContent,
            ]);
    } else {
        // No stage yet — create one containing the new content and append it to the program.
        const block = project.getMain().expression.expression;
        const newStage = Evaluate.make(StageType.getReference(locales), [
            ListLiteral.make([newContent]),
        ]);
        database.Projects.reviseProject(
            project.withRevisedNodes([[block, block.withStatement(newStage)]]),
        );
    }
}

export function getStage(project: Project): Evaluate | undefined {
    const StageType = project.shares.output.Stage;

    for (const source of project.getSources()) {
        const context = project.getContext(source);
        const stage = source.expression.nodes(
            (node): node is Evaluate =>
                node instanceof Evaluate && node.is(StageType, context),
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
                n instanceof Evaluate && n.is(PhraseType, context),
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
                n instanceof Evaluate && n.is(GroupType, context),
        );
        if (group) return group;
    }
    return undefined;
}

/** The structural kind of a program's rendered output expression, used to choose type-correct
 *  palette transformations. `value` is any non-output, non-text expression (it may be displayed as
 *  text via Convert); every other kind is an output structure, a bare Form, or text. */
export type OutputKind =
    | 'none'
    | 'text'
    | 'value'
    | 'form'
    | 'phrase'
    | 'group'
    | 'shape'
    | 'stage'
    | 'say';

/** The program's root block and its result statements — the statements whose values make up the
 *  rendered output (1 → that value, 2+ → a list of them). */
function getOutputExpression(project: Project): {
    block: Block;
    results: Expression[];
} {
    const block = project.getMain().expression.expression;
    // The statements whose values make up the program's output: 0 → nothing, 1 → that value, 2+ → a
    // LIST of those values (see Block.collect/computeType). Binds and definitions are excluded.
    return { block, results: block.getResultStatements() };
}

/** Map a computed type to an OutputKind when it is (or is a union of) output structure types, a bare
 *  Form, or text/markup; otherwise undefined (a plain value that may be text-converted). Lets a
 *  reference or call that evaluates to an output (e.g. `s: Shape(…)` then `s`) be classified as that
 *  output rather than as a `value` — the invariant that prevents text-wrapping an output. */
function outputKindOfType(
    type: Type,
    project: Project,
): OutputKind | undefined {
    const output = project.shares.output;
    const members = type instanceof UnionType ? type.enumerate() : [type];

    function memberKind(member: Type): OutputKind | 'other' {
        if (member instanceof TextType || member instanceof FormattedType)
            return 'text';
        if (member instanceof StructureType) {
            const def = member.definition;
            if (def === output.Stage) return 'stage';
            if (def === output.Group) return 'group';
            if (def === output.Phrase) return 'phrase';
            if (def === output.Shape) return 'shape';
            if (def === output.Say) return 'say';
            if (
                def === output.Rectangle ||
                def === output.Circle ||
                def === output.Polygon
            )
                return 'form';
        }
        return 'other';
    }

    const kinds = members.map(memberKind);
    if (kinds.every((k) => k === 'text')) return 'text';
    if (kinds.every((k) => k === 'form')) return 'form';

    // The distinct output/form kinds present (ignoring text and non-output `other` members like ø).
    const structured = new Set(
        kinds.filter((k) => k !== 'text' && k !== 'other'),
    );
    // No output/form member at all → a plain value that may be shown as text via Convert.
    if (structured.size === 0) return undefined;
    // A single output/form kind (possibly unioned with text or ø) → classify as that kind, so it
    // gets its normal type-correct offers and is NEVER treated as a text-convertible `value`. This
    // is what stops e.g. a `Group|ø`-typed expression from offering "make a Phrase by converting it
    // to text".
    if (structured.size === 1) return [...structured][0];
    // A union of several output kinds → pick the kind whose wrap offers are valid for every member:
    // a Stage member → no wrap; a Shape/Form member → Stage-only (Shape can't go in a Group);
    // otherwise Phrase/Group/Say → both Group and Stage are valid.
    if (structured.has('stage')) return 'stage';
    if (structured.has('shape') || structured.has('form')) return 'shape';
    return 'phrase';
}

/** If a type is a LIST whose elements are outputs, the element output kind; otherwise undefined. Used
 *  to treat an expression that evaluates to a list of outputs (e.g. `[Phrase('a') Phrase('b')]`) as a
 *  wrappable group — the whole list becomes a container's content. Forms/values lists don't count. */
function listElementOutputKind(
    type: Type,
    project: Project,
): OutputKind | undefined {
    if (!(type instanceof ListType) || type.type === undefined)
        return undefined;
    const elementKind = outputKindOfType(type.type, project);
    return elementKind === 'phrase' ||
        elementKind === 'group' ||
        elementKind === 'shape' ||
        elementKind === 'say' ||
        elementKind === 'stage'
        ? elementKind
        : undefined;
}

/** Classify the program's rendered output expression so the palette can offer only type-correct
 *  transformations. `isList` is true when the expression is a LIST of outputs — wraps then use the
 *  whole list as the container's content rather than wrapping a single output. */
export function classifyOutput(project: Project): {
    kind: OutputKind;
    expression: Expression | undefined;
    isList: boolean;
} {
    const { block, results } = getOutputExpression(project);
    if (results.length === 0)
        return { kind: 'none', expression: undefined, isList: false };

    // Two or more result statements: the block's value is a LIST of them. Classify by the list's
    // element kind and treat it as a list (wraps collect them all).
    if (results.length > 1) {
        const kind =
            listElementOutputKind(
                block.getType(project.getNodeContext(block)),
                project,
            ) ?? 'value';
        return { kind, expression: undefined, isList: true };
    }

    const last = results[0];
    if (last instanceof TextLiteral || last instanceof FormattedLiteral)
        return { kind: 'text', expression: last, isList: false };

    const context = project.getNodeContext(last);
    const output = project.shares.output;

    // Fast path: a directly-written output or form Evaluate.
    if (last instanceof Evaluate) {
        if (last.is(output.Stage, context))
            return { kind: 'stage', expression: last, isList: false };
        if (last.is(output.Group, context))
            return { kind: 'group', expression: last, isList: false };
        if (last.is(output.Phrase, context))
            return { kind: 'phrase', expression: last, isList: false };
        if (last.is(output.Shape, context))
            return { kind: 'shape', expression: last, isList: false };
        if (last.is(output.Say, context))
            return { kind: 'say', expression: last, isList: false };
        if (
            last.is(output.Rectangle, context) ||
            last.is(output.Circle, context) ||
            last.is(output.Polygon, context)
        )
            return { kind: 'form', expression: last, isList: false };
    }

    const type = last.getType(context);

    // A single expression that is itself a list of outputs: classify by element kind, wrap the list.
    const listKind = listElementOutputKind(type, project);
    if (listKind !== undefined)
        return { kind: listKind, expression: last, isList: true };

    // Otherwise classify by the computed type (handles references/calls that evaluate to an output).
    const kind = outputKindOfType(type, project) ?? 'value';
    return { kind, expression: last, isList: false };
}

/** The content list a container (Group/Stage) should wrap, and the revision that installs the built
 *  container into the program. Handles three shapes of output: multiple result statements (collect
 *  them all into a new list and replace them in the block), a single list-of-outputs expression (use
 *  it directly as content), and a single output (wrap it in a new one-element list). Returns
 *  undefined when there's nothing to wrap. */
function wrapTarget(project: Project):
    | {
          content: Expression;
          replace: (container: Evaluate) => [Node, Node | undefined][];
      }
    | undefined {
    const { block, results } = getOutputExpression(project);
    if (results.length === 0) return undefined;

    if (results.length === 1) {
        const expr = results[0];
        const { isList } = classifyOutput(project);
        return {
            content: isList ? expr : ListLiteral.make([expr]),
            replace: (container) => [[expr, container]],
        };
    }

    // Multiple result statements → collect them into the container's content, and rebuild the block
    // with the single container in place of the run of result statements (keeping Binds in place).
    const resultSet = new Set<Node>(results);
    return {
        content: ListLiteral.make([...results]),
        replace: (container) => {
            let inserted = false;
            const newStatements: Expression[] = [];
            for (const statement of block.statements) {
                if (resultSet.has(statement)) {
                    if (!inserted) {
                        newStatements.push(container);
                        inserted = true;
                    }
                } else newStatements.push(statement);
            }
            return [[block, block.replace(block.statements, newStatements)]];
        },
    };
}

/** The output-creation actions the no-selection palette offers for a given output state. Pure, so
 *  it can be unit-tested without mounting the component. `placeholder` is the distinct "start from
 *  nothing" action (add a placeholder Phrase); the others transform existing output/text. */
export type OutputOffer =
    | 'placeholder'
    | 'phrase'
    | 'shape'
    | 'group'
    | 'stage';

export function offersFor(
    kind: OutputKind,
    stageExists: boolean,
): OutputOffer[] {
    // No output at all: there's nothing to wrap, so offer only to add a placeholder Phrase to start.
    if (kind === 'none') return ['placeholder'];

    const offers: OutputOffer[] = [];
    // Make a Phrase from existing text, or a (text-convertible) value — never from an output/Form.
    if (kind === 'text' || kind === 'value') offers.push('phrase');
    // Wrap a bare Form in a Shape.
    if (kind === 'form') offers.push('shape');
    // Wrap a Phrase/Say in a Group (Group excludes Shape and Stage); not if a Stage already exists.
    if (!stageExists && (kind === 'phrase' || kind === 'say'))
        offers.push('group');
    // Wrap a single output in a Stage; not for a bare Form (Shape-wrap first), an existing Stage, or
    // when a Stage already exists.
    if (
        !stageExists &&
        (kind === 'phrase' ||
            kind === 'group' ||
            kind === 'shape' ||
            kind === 'say')
    )
        offers.push('stage');
    return offers;
}

/** Make a Phrase: from nothing (welcome), from existing text (reuse), or from a value (as text via
 *  Convert). Only valid for the `none`/`text`/`value` states — never wraps an output or Form. */
export function addSoloPhrase(
    db: Database,
    project: Project,
): Project | undefined {
    const { block, results } = getOutputExpression(project);
    const { kind } = classifyOutput(project);
    if (kind !== 'none' && kind !== 'text' && kind !== 'value') return;
    // Only the empty or single-value cases make a sensible single Phrase.
    if (results.length > 1) return;

    const last = results[0];
    const text =
        last === undefined
            ? TextLiteral.make(db.Locales.getLocale().ui.phrases.welcome)
            : last instanceof TextLiteral || last instanceof FormattedLiteral
              ? last
              : Convert.make(last, TextType.make());

    const phrase = Evaluate.make(Reference.make(PHRASE_SYMBOL), [text]);

    const revised = project.withRevisedNodes([
        last ? [last, phrase] : [block, block.withStatement(phrase)],
    ]);
    db.Projects.reviseProject(revised);
    return revised;
}

/** Make a Shape: wrap a bare Form output in a Shape, or create a placeholder Shape when there's no
 *  output. */
export function addShape(db: Database, project: Project): Project | undefined {
    const { block } = getOutputExpression(project);
    const { kind, expression } = classifyOutput(project);
    const locales = db.Locales.getLocaleSet();

    let revised: Project | undefined;
    if (kind === 'form' && expression !== undefined) {
        const shape = Evaluate.make(
            project.shares.output.Shape.getReference(locales),
            [expression],
        );
        revised = project.withRevisedNodes([[expression, shape]]);
    } else if (kind === 'none') {
        const shape = createPlaceholderShape(project, locales);
        revised = project.withRevisedNodes([
            [block, block.withStatement(shape)],
        ]);
    }
    if (revised) db.Projects.reviseProject(revised);
    return revised;
}

/** Wrap a Phrase/Say output (or a whole list of them) in a Group with a Stack layout. Group content
 *  excludes Shape/Stage. */
export function addGroup(db: Database, project: Project): Project | undefined {
    const { kind } = classifyOutput(project);
    if (kind !== 'phrase' && kind !== 'say') return;

    const target = wrapTarget(project);
    if (target === undefined) return;

    const locales = db.Locales.getLocaleSet();
    const group = Evaluate.make(
        project.shares.output.Group.getReference(locales),
        [
            Evaluate.make(
                project.shares.output.Stack.getReference(locales),
                [],
            ),
            target.content,
        ],
    );

    const revised = project.withRevisedNodes(target.replace(group));
    db.Projects.reviseProject(revised);
    return revised;
}

/** Wrap the program's output in a Stage, or create a Stage with a placeholder when there's no
 *  output. Bails if a Stage already exists anywhere. */
export function addStage(db: Database, project: Project): Project | undefined {
    if (getStage(project) !== undefined) return;

    const { kind } = classifyOutput(project);
    const eligible =
        kind === 'phrase' ||
        kind === 'group' ||
        kind === 'shape' ||
        kind === 'say';
    // Only create a Stage when wrapping an eligible output or starting from nothing.
    if (!eligible && kind !== 'none') return;

    const locales = db.Locales.getLocaleSet();
    const Stage = project.shares.output.Stage;

    let revised: Project | undefined;
    if (eligible) {
        // Wrap the existing output(s) — a single output, a list of outputs, or several output
        // statements — as the stage's content.
        const target = wrapTarget(project);
        if (target === undefined) return;
        const stage = Evaluate.make(Stage.getReference(locales), [
            target.content,
        ]);
        revised = project.withRevisedNodes(target.replace(stage));
    } else {
        // Empty program: create a Stage seeded with a placeholder Phrase, appended to the block.
        const { block } = getOutputExpression(project);
        const stage = Evaluate.make(Stage.getReference(locales), [
            ListLiteral.make([createPlaceholderPhrase(project, locales)]),
        ]);
        revised = project.withRevisedNodes([
            [block, block.withStatement(stage)],
        ]);
    }
    db.Projects.reviseProject(revised);
    return revised;
}

export function hasOutput(project: Project) {
    return project.getSources().some((source) => {
        const context = project.getContext(source);
        return source.nodes().some((n) => isOutput(n, project, context));
    });
}

export function isOutput(n: Node, project: Project, context: Context) {
    return (
        n instanceof Evaluate &&
        (n.is(project.shares.output.Phrase, context) ||
            n.is(project.shares.output.Group, context) ||
            n.is(project.shares.output.Stage, context) ||
            n.is(project.shares.output.Shape, context) ||
            n.is(project.shares.output.Say, context))
    );
}
