import type Conflict from '@conflicts/Conflict';
import ReferenceCycle from '@conflicts/ReferenceCycle';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnknownName } from '@conflicts/UnknownName';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import Refer from '@edit/revision/Refer';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import type Evaluator from '@runtime/Evaluator';
import StartFinish from '@runtime/StartFinish';
import type Step from '@runtime/Step';
import NameException from '@values/NameException';
import type Value from '@values/Value';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import { type TemplateInput } from '@locale/Locales';
import BinaryEvaluate from '@nodes/BinaryEvaluate';
import Bind from '@nodes/Bind';
import Borrow from '@nodes/Borrow';
import type Context from '@nodes/Context';
import type Definition from '@nodes/Definition';
import Delete from '@nodes/Delete';
import Expression, { type GuardContext } from '@nodes/Expression';
import FunctionDefinition from '@nodes/FunctionDefinition';
import FunctionType from '@nodes/FunctionType';
import getGuards from '@nodes/getGuards';
import Insert from '@nodes/Insert';
import NameToken from '@nodes/NameToken';
import type Node from '@nodes/Node';
import { ListOf, node, type Grammar, type Replacement } from '@nodes/Node';
import PropertyReference from '@nodes/PropertyReference';
import Row from '@nodes/Row';
import Select from '@nodes/Select';
import TableType from '@nodes/TableType';
import Update from '@nodes/Update';
import Reaction from '@nodes/Reaction';
import SimpleExpression from '@nodes/SimpleExpression';
import Source from '@nodes/Source';
import StreamDefinition from '@nodes/StreamDefinition';
import StreamType from '@nodes/StreamType';
import StructureDefinition from '@nodes/StructureDefinition';
import { Sym } from '@nodes/Sym';
import Token from '@nodes/Token';
import Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';
import TypeVariable from '@nodes/TypeVariable';
import UnaryEvaluate from '@nodes/UnaryEvaluate';
import UnionType from '@nodes/UnionType';
import UnknownType from '@nodes/UnknownType';
import UnknownNameType from '@nodes/UnknownNameType';

/**
 * A reference to some Definition. Can optionally take the definition which it refers,
 * which is helpful when reasoning about References that aren't situated in a program (e.g, example code),
 * but nevertheless have a known definition to which they refer. This is also helpful
 * in localization, allowing us to easily switch definitions.
 */
export default class Reference extends SimpleExpression {
    readonly name: Token;
    readonly definition: Definition | undefined;

    constructor(name: Token, definition?: Definition) {
        super();

        this.name = name;
        this.definition = definition;

        this.computeChildren();
    }

    static make(name: string, definition?: Definition) {
        return new Reference(new NameToken(name), definition);
    }

    static getPossibleReferences(
        /** The type expected */
        type: Type | undefined,
        /** The reference being replaced, or the node context in which a reference is being inserted */
        reference: Reference | Node,
        /** Whether to complete the reference */
        complete: boolean,
        /** The context of the edit */
        context: Context,
    ): Refer[] {
        // Find the parent.
        const parent = reference.getParent(context);

        // A matching function to see if a definition matches
        const match = (def: Definition, prefix: string, name: string) =>
            def.getNames().find((n) => n.startsWith(prefix)) ?? name;

        // If a reference is being completed, use a prefix.
        const prefix =
            reference instanceof Reference && complete
                ? reference.getName()
                : undefined;

        // Pick the right pool of definitions to suggest:
        //  - A Reference that's the name of a PropertyReference: only the
        //    subject's properties (a typo'd name shouldn't fall back to the
        //    whole scope).
        //  - A Reference that's a cell of a table-operation Row: only the
        //    table's columns.
        //  - A PropertyReference being autocompleted (existing behavior).
        //  - Otherwise: walk the surrounding scope.
        const refParent = parent;
        const contextual: Definition[] | undefined = (() => {
            if (refParent instanceof PropertyReference)
                return refParent.getDefinitions(refParent, context);
            if (refParent instanceof Row) {
                const op = refParent.getParent(context);
                const tableExpr =
                    op instanceof Select
                        ? op.table
                        : op instanceof Insert
                          ? op.table
                          : op instanceof Update
                            ? op.table
                            : op instanceof Delete
                              ? op.table
                              : undefined;
                if (tableExpr) {
                    const tt = tableExpr.getType(context);
                    if (tt instanceof TableType) return tt.getDefinitions();
                }
                return [];
            }
            return undefined;
        })();

        // If the anchor is being replaced but isn't a reference, suggest nothing.
        // Otherwise, suggest references in the anchor node's scope that complete the prefix.
        return (
            [
                // Find all the definitions in scope. If the anchor happens to be a property reference and we're completing,
                // only find definitions in it's scope.
                ...(contextual !== undefined
                    ? contextual
                    : reference instanceof PropertyReference && complete
                      ? reference.getDefinitions(reference, context)
                      : reference.getDefinitionsInScope(context)),
                // Find all the sources in scope if the context is a borrow.
                ...(reference instanceof Borrow
                    ? context.project
                          .getSupplements()
                          .filter((s) => s !== context.source)
                    : []),
            ]
                // If there's a prefix we're completing, include
                .filter(
                    (def) =>
                        prefix === undefined ||
                        def.getNames().some((name) => name.startsWith(prefix)),
                )
                // Translate the definitions into References, or to the definitions.
                .map((definition) => {
                    // Is the function an operator? That affects how we name it.
                    const isOperator =
                        definition instanceof FunctionDefinition &&
                        definition.isOperator();
                    // Is the type of the definition coming from a stream? We might generate a reference to the stream itself.
                    const streamType = !(definition instanceof TypeVariable)
                        ? context.getStreamType(definition.getType(context))
                        : undefined;
                    if (
                        // A source?
                        definition instanceof Source ||
                        // Bind of acceptible type? Make a reference.
                        (definition instanceof Bind &&
                            (type === undefined ||
                                type.accepts(
                                    definition
                                        .getType(context)
                                        .generalize(context),
                                    context,
                                ))) ||
                        // If this definition replaced the current one and it's concrete types, would it be of an acceptable type?
                        (type instanceof FunctionType &&
                            definition instanceof FunctionDefinition &&
                            definition
                                .getType(context)
                                .accepts(type, context) &&
                            // Only accept definitions with symbolic names if a binary evaluate.
                            ((!(parent instanceof BinaryEvaluate) &&
                                !(parent instanceof UnaryEvaluate)) ||
                                definition.names.hasOperatorName())) ||
                        // If the type is a StreamType and the definition is a stream with a matching type, suggest
                        (type instanceof StreamType &&
                            streamType !== undefined &&
                            type.accepts(streamType, context))
                    ) {
                        return new Refer(
                            (name) =>
                                new Reference(
                                    new Token(
                                        // Completing? Pass the prefix to find a matching name.
                                        prefix
                                            ? match(definition, prefix, name)
                                            : name,
                                        isOperator ? Sym.Operator : Sym.Name,
                                    ),
                                ),
                            definition,
                            isOperator,
                        );
                    }
                    // If the anchor is in list field, and the anchor is not being replaced, offer (Binary/Unary)Evaluate in scope.
                    else if (
                        complete &&
                        reference.getParent(context)?.getFieldOfChild(reference)
                            ?.kind instanceof ListOf
                    ) {
                        if (
                            definition instanceof FunctionDefinition &&
                            // Any type?
                            (type === undefined ||
                                // A function that returns a type that matches the expected type?
                                type.accepts(
                                    definition.getOutputType(context),
                                    context,
                                ))
                        ) {
                            return new Refer(
                                (name) =>
                                    definition.getEvaluateTemplate(
                                        prefix
                                            ? match(definition, prefix, name)
                                            : name,
                                        context,
                                        true,
                                        true,
                                        undefined,
                                    ),
                                definition,
                            );
                        }
                        // Structure definition or stream definition? Make an Evaluate.
                        else if (
                            (definition instanceof StructureDefinition ||
                                definition instanceof StreamDefinition) &&
                            (type === undefined ||
                                type.accepts(
                                    definition.getType(context),
                                    context,
                                ))
                        ) {
                            return new Refer(
                                (name) =>
                                    definition.getEvaluateTemplate(
                                        prefix
                                            ? match(definition, prefix, name)
                                            : name,
                                        context,
                                        true,
                                    ),
                                definition,
                            );
                        }
                    } else return undefined;
                })
                // Filter out undefined.
                .filter((ref): ref is Refer => ref !== undefined)
        );
    }

    static getPossibleReplacements({ type, node, context }: ReplaceContext) {
        return this.getPossibleReferences(type, node, false, context);
    }

    static getPossibleInsertions({ type, parent, context }: InsertContext) {
        return this.getPossibleReferences(type, parent, false, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'Reference';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'name',
                kind: node(Sym.Name),
                uncompletable: true,
                label: () => (l) => l.node.Reference.name,
                // The valid definitions of the name are anything in scope, except for the current name.
                getDefinitions: (context: Context) =>
                    this.getDefinitionsInScope(context).filter(
                        (def) => !def.hasName(this.getName()),
                    ),
            },
        ];
    }

    getPurpose() {
        return Purpose.Definitions;
    }

    clone(replace?: Replacement) {
        return new Reference(
            this.replaceChild('name', this.name, replace),
        ) as this;
    }

    isPlaceholder() {
        return this.name.isSymbol(Sym.Placeholder);
    }

    getName() {
        return this.name.getText();
    }

    withName(name: string) {
        return new Reference(new NameToken(name), this.definition);
    }

    getCorrespondingDefinition(context: Context): Definition | undefined {
        return this.resolve(context);
    }

    computeConflicts(context: Context): Conflict[] {
        const bindOrTypeVar = this.resolve(context);

        const conflicts = [];

        // Is this name undefined in scope?
        if (bindOrTypeVar === undefined) {
            const scope = this.getScope(context);
            // Suppress when the scope is itself an UnknownType — the root-cause
            // conflict lives on whatever made the scope corrupt. Without this,
            // `missing + 10` would yield UnknownName twice: once for `missing`
            // and once for `+`, because resolving `+` on UnknownNameType also
            // fails. #1146
            if (!(scope instanceof UnknownType))
                conflicts.push(
                    new UnknownName(
                        this,
                        scope instanceof Type ? scope : undefined,
                    ),
                );
        }
        // Can't refer to type variables with a reference, those can only be mentioned in type inputs.
        else if (bindOrTypeVar instanceof TypeVariable)
            conflicts.push(new UnexpectedTypeVariable(this));

        // Is this name referred to in its bind?
        if (
            bindOrTypeVar instanceof Bind &&
            context.source.root.hasAncestor(this, bindOrTypeVar)
        ) {
            // Does this name have a parent that's a reaction, and is the bind a parent of that reaction?
            const reaction = context
                .getRoot(this)
                ?.getAncestors(this)
                ?.find((n) => n instanceof Reaction);
            const validCircularReference =
                reaction !== undefined &&
                context
                    .getRoot(reaction)
                    ?.getAncestors(reaction)
                    .includes(bindOrTypeVar);
            if (!validCircularReference)
                conflicts.push(new ReferenceCycle(this));
        }

        return conflicts;
    }

    resolve(context?: Context): Definition | undefined {
        // Ask the enclosing block for any matching names. It will recursively check the ancestors.
        return (
            this.definition ??
            (context === undefined
                ? undefined
                : this.getDefinitionOfNameInScope(this.getName(), context))
        );
    }

    refersTo(context: Context, def: StructureDefinition) {
        return this.resolve(context) === def;
    }

    getTypeGuardKey() {
        return 'this';
    }

    computeType(context: Context): Type {
        // The type is the type of the bind.
        const definition = this.resolve(context);

        // If we couldn't find a definition or the definition is a type variable, return unknown.
        if (definition === undefined || definition instanceof TypeVariable)
            return new UnknownNameType(this, this.name, undefined);

        const type = definition.getType(context);

        // Otherwise, do some type guard analyis on the definition.
        // Is the type a union? Find the subset of types that are feasible, given any type checks in conditionals.
        if (
            definition instanceof Bind &&
            type instanceof UnionType &&
            context.getReferenceType(this, this.getTypeGuardKey()) === undefined
        ) {
            // Find any conditionals with type checks that refer to the value bound to this name.
            // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
            const guards = getGuards(this, context, (node) => {
                // Node is a reference
                if (
                    node instanceof Reference &&
                    // And a reference to the same definition as this reference
                    definition === node.resolve(context)
                ) {
                    const parent = context.source.root.getParent(node);
                    return parent instanceof Expression && parent.guardsTypes();
                } else return false;
            });

            // Grab the furthest ancestor and evaluate possible types from there.
            const root = guards[0];
            if (root !== undefined) {
                const possibleTypes = type.getTypeSet(context);
                root.evaluateTypeGuards(possibleTypes, {
                    bind: definition,
                    key: this.getTypeGuardKey(),
                    original: possibleTypes,
                    context,
                });
            }
        }

        return context.getReferenceType(this, this.getTypeGuardKey()) ?? type;
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // Cache the type of this name at this point in execution.
        if (
            this.resolve(guard.context) === guard.bind &&
            guard.key === this.getTypeGuardKey()
        )
            guard.context.setReferenceType(
                this,
                this.getTypeGuardKey(),
                UnionType.getPossibleUnion(guard.context, current.list()),
            );

        return current;
    }

    isGuardMatch(guard: GuardContext): boolean {
        // This is a guard match if it corresponds to the same bind and key
        return (
            this.resolve(guard.context) === guard.bind &&
            this.getTypeGuardKey() === guard.key
        );
    }

    getDependencies(context: Context) {
        const def = this.resolve(context);
        return def instanceof Expression ? [def] : [];
    }

    /** References are only constant if they don't refer to a stream */
    isConstant() {
        return false;
    }

    isProvablyNonZero(context: Context, depth = 0): boolean {
        // Follow the bound value upstream, bounding how far so mutually
        // recursive binds can't loop forever.
        if (depth >= 4) return false;
        const definition = this.resolve(context);
        return definition instanceof Bind && definition.value !== undefined
            ? definition.value.isProvablyNonZero(context, depth + 1)
            : false;
    }

    compile(): Step[] {
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Search for the name in the given evaluation context.
        return (
            evaluator.resolve(this.name.getText()) ??
            new NameException(this, this.name, undefined, evaluator)
        );
    }

    getStart() {
        return this.name;
    }

    getFinish() {
        return this.name;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.Reference;
    getLocalePath() {
        return Reference.LocalePath;
    }

    getStartExplanations(locales: Locales, context: Context) {
        return locales.concretize(
            (l) => l.node.Reference.start,
            {
                name: new NodeRef(this.name, locales, context),
            },
        );
    }

    getDescriptionInputs(): Record<string, TemplateInput> {
        return {
            name: this.getName(),
        };
    }

    getCharacter() {
        return { symbols: this.name.getText() };
    }
}
