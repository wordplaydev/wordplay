import Bind from '#nodes/Bind.ts';
import FunctionDefinition from '#nodes/FunctionDefinition.ts';
import StructureDefinition from '#nodes/StructureDefinition.ts';
import levenshtein from '#util/levenshtein.ts';
import NameType from '#nodes/NameType.ts';
import type { Resolution, Resolutions } from '#conflicts/Conflict.ts';
import { UnknownTypeName } from '#conflicts/UnknownTypeName.ts';
import Evaluate from '#nodes/Evaluate.ts';
import { Sym } from '#nodes/Sym.ts';
import Reference from '#nodes/Reference.ts';
import UnknownType from '#nodes/UnknownType.ts';
import { UnparsableConflict } from '#conflicts/UnparsableConflict.ts';
import ExpectedBooleanCondition from '#conflicts/ExpectedBooleanCondition.ts';
import ExpectedStream from '#conflicts/ExpectedStream.ts';
import { ImpossibleType } from '#conflicts/ImpossibleType.ts';
import IncompatibleInput from '#conflicts/IncompatibleInput.ts';
import IncompatibleType from '#conflicts/IncompatibleType.ts';
import NotInstantiable from '#conflicts/NotInstantiable.ts';
import { UnknownConversion } from '#conflicts/UnknownConversion.ts';
import type Context from '#nodes/Context.ts';
import { isDamaged, isUnknowable } from '#nodes/damage.ts';
import Expression from '#nodes/Expression.ts';
import Type from '#nodes/Type.ts';
import type Conflict from '#conflicts/Conflict.ts';
import MissingInput from '#conflicts/MissingInput.ts';
import UnexpectedInput from '#conflicts/UnexpectedInput.ts';
import UnknownInput from '#conflicts/UnknownInput.ts';
import { UnknownName } from '#conflicts/UnknownName.ts';
import type Node from '#nodes/Node.ts';
import Token from '#nodes/Token.ts';

/** One mistake: the first conflict that reports it, and the others that report it again elsewhere. */
export type Cause = { conflict: Conflict; echoes: Conflict[] };

/**
 * What makes two conflicts the same mistake, if anything does. A name that isn't defined is
 * one mistake however many places use it: a misspelled definition, not thirty misspelled uses.
 */
function causeOf(
    conflict: Conflict,
    isOwn: (node: Node) => boolean,
): string | undefined {
    if (
        conflict instanceof UnknownName &&
        !(conflict.name instanceof Token) &&
        conflict.type === undefined
    )
        return `UnknownName:${conflict.name.getName()}`;
    // The same name, said not to be a function because it is not anything.
    if (
        conflict instanceof IncompatibleInput &&
        conflict.givenNode instanceof Reference &&
        conflict.givenType instanceof UnknownType
    )
        return `UnknownName:${conflict.givenNode.getName()}`;
    // Inputs that don't match a definition the creator wrote are a question about the
    // definition, which is one thing, however many evaluations of it there are. A
    // built-in's definition isn't theirs to have changed, so each of those is its own.
    if (
        (conflict instanceof UnexpectedInput ||
            conflict instanceof MissingInput ||
            conflict instanceof UnknownInput) &&
        isOwn(conflict.func)
    )
        return `inputs:${conflict.func.id}`;
    return undefined;
}

/**
 * Conflicts as the mistakes they report, in the order given. Every conflict is still there
 * to be shown where it is, but they are counted and listed by cause, so that a creator sees
 * how many things there are to fix rather than how many places one of them reaches.
 */
export function groupByCause(
    conflicts: readonly Conflict[],
    isOwn: (node: Node) => boolean,
): Cause[] {
    const causes: Cause[] = [];
    const known = new Map<string, Cause>();
    for (const conflict of conflicts) {
        const key = causeOf(conflict, isOwn);
        const cause = key === undefined ? undefined : known.get(key);
        if (cause) cause.echoes.push(conflict);
        else {
            const first = { conflict, echoes: [] };
            causes.push(first);
            if (key !== undefined) known.set(key, first);
        }
    }
    return causes;
}

/** The conflicts that compare one type to another, and so say nothing when one is unknown. */
const Comparisons: (new (...inputs: never[]) => Conflict)[] = [
    IncompatibleInput,
    IncompatibleType,
    ImpossibleType,
    ExpectedBooleanCondition,
    UnknownConversion,
];

/**
 * Conflicts without the ones that only repeat another: a complaint about a type, where the
 * type is unknown because of something already reported, and a complaint about using a
 * definition that is itself damaged. Each check could ask this of itself, and many do (see
 * `Context.isUnknownDownstream`), but one missed check is a cascade, so it is also asked of
 * every conflict where they are gathered.
 */
export function withoutEchoes(
    conflicts: Conflict[],
    context: Context,
): Conflict[] {
    // What the conflicts that name a cause are about.
    const causes = new Set<Node>();
    for (const conflict of conflicts)
        if (conflict instanceof UnknownName) causes.add(conflict.name);
        else if (conflict instanceof UnparsableConflict)
            causes.add(conflict.unparsable);

    // The names of the definitions that couldn't be parsed: what follows a `•` or `ƒ`
    // that begins something unparsable. A use of one says nothing the definition didn't.
    const undefinable = new Set<string>();
    for (const conflict of conflicts)
        if (conflict instanceof UnparsableConflict) {
            const tokens = conflict.unparsable.unparsables.filter(
                (token) =>
                    !token.isSymbol(Sym.Doc) && !token.isSymbol(Sym.Share),
            );
            const first = tokens.findIndex(
                (token) =>
                    token.isSymbol(Sym.Type) || token.isSymbol(Sym.Function),
            );
            const name = tokens
                .slice(first + 1)
                .find((token) => token.isSymbol(Sym.Name));
            // At the start, or after the one thing that kept it from being parsed.
            if (first >= 0 && first <= 1 && name)
                undefinable.add(name.getText());
        }
    /** The name of what an expression evaluates, if it evaluates something by name. */
    const evaluated = (node: Node | undefined): string | undefined =>
        node instanceof Evaluate && node.fun instanceof Reference
            ? node.fun.getName()
            : undefined;
    const usesUndefinable = (conflict: Conflict) => {
        if (undefinable.size === 0) return false;
        if (
            conflict instanceof UnexpectedInput ||
            conflict instanceof MissingInput ||
            conflict instanceof UnknownInput
        )
            return undefinable.has(evaluated(conflict.evaluate) ?? '');
        if (conflict instanceof IncompatibleInput)
            return undefinable.has(
                evaluated(
                    context
                        .getRoot(conflict.givenNode)
                        ?.getParent(conflict.givenNode),
                ) ??
                    (conflict.givenNode instanceof Reference
                        ? conflict.givenNode.getName()
                        : ''),
            );
        if (conflict instanceof UnknownTypeName)
            return undefinable.has(conflict.name.getName());
        if (
            conflict instanceof UnknownName &&
            !(conflict.name instanceof Token)
        )
            return undefinable.has(conflict.name.getName());
        return false;
    };

    return conflicts.filter((conflict) => {
        if (usesUndefinable(conflict)) return false;
        // A comparison of something that has a cause inside of it.
        // Not an input given to something: what is given may be a whole expression, and
        // a name unknown somewhere in it may be the echo, rather than the cause.
        const subject =
            conflict instanceof ImpossibleType ||
            conflict instanceof IncompatibleType
                ? conflict.expression
                : conflict instanceof ExpectedBooleanCondition
                  ? conflict.conditional.condition
                  : conflict instanceof UnknownConversion
                    ? conflict.convert.expression
                    : undefined;
        // Inside, not the thing itself: a name that isn't defined is also not a
        // function, and which of those two is said is not for this to decide.
        if (
            causes.size > 0 &&
            subject
                ?.nodes()
                .some((node) => node !== subject && causes.has(node))
        )
            return false;
        if (conflict instanceof NotInstantiable)
            return !isDamaged(conflict.definition);
        if (conflict instanceof ExpectedStream)
            return !conflict.reaction.condition
                .nodes()
                .some(
                    (node) =>
                        node instanceof Expression &&
                        isUnknowable(node.getType(context), context),
                );
        // A name unknown where it was looked for, which is itself unknown. The name is
        // not the echo: it is the cause that the rest echo.
        if (conflict instanceof UnknownName)
            return !isUnknowable(conflict.type, context);
        if (!Comparisons.some((kind) => conflict instanceof kind)) return true;
        // The types a comparison names, and for a conversion, the type converted from.
        // Not the nodes it names: an operator that nothing defines is a node of unknown
        // type too, and that conflict is the cause.
        return !(
            Object.values(conflict).some(
                (field) =>
                    field instanceof Type && isUnknowable(field, context),
            ) ||
            (conflict instanceof UnknownConversion &&
                isUnknowable(
                    conflict.convert.expression.getType(context),
                    context,
                ))
        );
    });
}

/**
 * What can be done about a cause. A conflict's own repairs are about the one place it is
 * in, which for a name that isn't defined would leave every other use of it as it was: a
 * repair that fixes one of thirty is not much of one. So a name the program defines that
 * is one letter away is offered as a rename of every use at once, ahead of whatever the
 * conflict itself suggests for its own place.
 */
export function getCauseResolutions(
    cause: Cause,
    context: Context,
    concepts: Node[],
): Resolutions {
    const own = cause.conflict.getResolutions(context, concepts);
    const unknown =
        cause.conflict instanceof UnknownName &&
        !(cause.conflict.name instanceof Token)
            ? cause.conflict.name.getName()
            : undefined;
    if (unknown === undefined) return own;

    const uses = [cause.conflict, ...cause.echoes]
        .filter((conflict) => conflict instanceof UnknownName)
        .map((conflict) => conflict.name)
        .filter(
            (name) => name instanceof Reference || name instanceof NameType,
        );

    // What the program defines where every use can see it: its top-level structures,
    // functions and binds. Not a function's inputs, which are one letter from many things
    // and in scope for almost none of them.
    const defined = new Set<string>();
    for (const statement of context.source.expression.expression.statements)
        if (
            statement instanceof StructureDefinition ||
            statement instanceof FunctionDefinition ||
            statement instanceof Bind
        )
            for (const name of statement.names.getNames()) defined.add(name);
    const renames = [...defined]
        .filter((name) => name !== unknown && levenshtein(unknown, name) <= 1)
        .map((name): Resolution => ({
            kind: 'repair',
            description: (locales) =>
                locales.concretize(
                    (l) => l.node.Reference.conflict.UnknownName.resolution,
                    { suggestion: name },
                ),
            mediator: (ctx) => ({
                newProject: ctx.project.withRevisedNodes(
                    uses.map((use) => [
                        use,
                        use instanceof NameType
                            ? NameType.make(name)
                            : Reference.make(name),
                    ]),
                ),
            }),
        }));
    const [first, ...rest] = renames;
    // The conflict's own, less any that would rename this one place to the same thing.
    return first === undefined
        ? own
        : [
              first,
              ...rest,
              ...own.filter((resolution) => {
                  if (resolution.kind !== 'repair') return true;
                  const { newNode } = resolution.mediator(
                      context,
                      context.project.getLocales(),
                  );
                  return !(
                      newNode instanceof Reference &&
                      defined.has(newNode.getName())
                  );
              }),
          ];
}
