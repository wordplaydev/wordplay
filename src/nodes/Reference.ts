import type Conflict from '@conflicts/Conflict';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnknownName } from '@conflicts/UnknownName';
import Expression, { type GuardContext } from './Expression';
import type Token from './Token';
import Type from './Type';
import TypeVariable from './TypeVariable';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import type Context from './Context';
import type Definition from './Definition';
import Bind from './Bind';
import ReferenceCycle from '@conflicts/ReferenceCycle';
import Reaction from './Reaction';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import NameToken from './NameToken';
import StartFinish from '@runtime/StartFinish';
import UnknownNameType from './UnknownNameType';
import { node, type Grammar, type Replacement, ListOf } from './Node';
import SimpleExpression from './SimpleExpression';
import NameException from '@values/NameException';
import NodeRef from '@locale/NodeRef';
import Sym from './Sym';
import concretize, { type TemplateInput } from '../locale/concretize';
import Glyphs from '../lore/Glyphs';
import type Node from './Node';
import Refer from '../edit/Refer';
import Purpose from '../concepts/Purpose';
import StructureDefinition from './StructureDefinition';
import FunctionDefinition from './FunctionDefinition';
import StreamDefinition from './StreamDefinition';
import FunctionType from './FunctionType';
import type Locales from '../locale/Locales';
import getGuards from './getGuards';

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

    static getPossibleNodes(
        expectedType: Type | undefined,
        anchor: Node,
        isBeingReplaced: boolean,
        context: Context,
    ): Refer[] {
        const match = (def: Definition, prefix: string, name: string) =>
            def.getNames().find((n) => n.startsWith(prefix)) ?? name;

        // If the node prior is a reference, find potential matching definitions in scope.
        const prefix = anchor instanceof Reference ? anchor.getName() : '';

        // If the anchor is being replaced but isn't a reference, suggest nothing.
        // Otherwise, suggest references in the anchor node's scope that complete the prefix.
        return (
            anchor
                // Find all the definitions in scope.
                .getDefinitionsInScope(context)
                // Only accept ones that have names starting with the prefix
                // and that have a matching type, if provided.
                .filter((def) =>
                    def.getNames().some((name) =>
                        // Hello
                        name.startsWith(prefix),
                    ),
                )
                // Translate the definitions into References, or  to the definitions.
                .map((definition) => {
                    // Bind of acceptible type? Make a reference.
                    if (
                        (definition instanceof Bind &&
                            (expectedType === undefined ||
                                expectedType.accepts(
                                    definition
                                        .getType(context)
                                        .generalize(context),
                                    context,
                                ))) || // A function type that matches the function?
                        (expectedType instanceof FunctionType &&
                            definition instanceof FunctionDefinition &&
                            expectedType.accepts(
                                definition.getType(context),
                                context,
                            ))
                    )
                        return new Refer(
                            (name) =>
                                Reference.make(match(definition, prefix, name)),
                            definition,
                        );
                    // If the anchor is in list field, and the anchor is not being replaced, offer (Binary/Unary)Evaluate in scope.
                    else if (
                        isBeingReplaced ||
                        anchor.getParent(context)?.getFieldOfChild(anchor)
                            ?.kind instanceof ListOf
                    ) {
                        if (
                            definition instanceof FunctionDefinition &&
                            // Any type?
                            (expectedType === undefined ||
                                // A function that returns a type that matches the expected type?
                                expectedType.accepts(
                                    definition.getOutputType(context),
                                    context,
                                ))
                        ) {
                            return new Refer(
                                (name) =>
                                    definition.getEvaluateTemplate(
                                        match(definition, prefix, name),
                                        context,
                                        undefined,
                                    ),
                                definition,
                            );
                        }
                        // Structure definition or stream definition? Make an Evaluate.
                        else if (
                            (definition instanceof StructureDefinition ||
                                definition instanceof StreamDefinition) &&
                            (expectedType === undefined ||
                                expectedType.accepts(
                                    definition.getType(context),
                                    context,
                                ))
                        ) {
                            return new Refer(
                                (name) =>
                                    definition.getEvaluateTemplate(
                                        match(definition, prefix, name),
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

    getDescriptor() {
        return 'Reference';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'name',
                kind: node(Sym.Name),
                uncompletable: true,
                label: (locales: Locales) =>
                    locales.get((l) => l.node.Reference.name),
                // The valid definitions of the name are anything in scope, except for the current name.
                getDefinitions: (context: Context) =>
                    this.getDefinitionsInScope(context).filter(
                        (def) => !def.hasName(this.getName()),
                    ),
            },
        ];
    }

    getPurpose() {
        return Purpose.Bind;
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

        // What is the type of the definition?
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

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.Reference);
    }

    getStartExplanations(locales: Locales, context: Context) {
        return concretize(
            locales,
            locales.get((l) => l.node.Reference.start),
            new NodeRef(this.name, locales, context),
        );
    }

    getDescriptionInputs(): TemplateInput[] {
        return [this.getName()];
    }

    getGlyphs() {
        return Glyphs.Reference;
    }
}
