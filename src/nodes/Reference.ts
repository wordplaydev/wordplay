import type Conflict from '@conflicts/Conflict';
import { UnexpectedTypeVariable } from '@conflicts/UnexpectedTypeVariable';
import { UnknownName } from '@conflicts/UnknownName';
import Expression from './Expression';
import Token from './Token';
import Type from './Type';
import TypeVariable from './TypeVariable';
import type Evaluator from '@runtime/Evaluator';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import type Context from './Context';
import type Definition from './Definition';
import Bind from './Bind';
import ReferenceCycle from '@conflicts/ReferenceCycle';
import Reaction from './Reaction';
import Conditional from './Conditional';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import Is from './Is';
import type StructureDefinition from './StructureDefinition';
import NameToken from './NameToken';
import StartFinish from '@runtime/StartFinish';
import UnknownNameType from './UnknownNameType';
import type { Replacement } from './Node';
import type Translation from '@translation/Translation';
import AtomicExpression from './AtomicExpression';
import NameException from '@runtime/NameException';
import NodeLink from '@translation/NodeLink';
import Emotion from '../lore/Emotion';
import Evaluate from './Evaluate';
import StreamDefinitionType from './StreamDefinitionType';

/**
 * A reference to some Definition. Can optionally take the definition which it refers,
 * which is helpful when reasoning about References that aren't situated in a program (e.g, example code),
 * but nevertheless have a known definition to which they refer. This is also helpful
 * in localization, allowing us to easily switch definitions.
 */
export default class Reference extends AtomicExpression {
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

    getGrammar() {
        return [
            {
                name: 'name',
                types: [Token],
                // The valid definitions of the name are anything in scope, except for the current name.
                getDefinitions: (context: Context) =>
                    this.getDefinitionsInScope(context).filter(
                        (def) => !def.hasName(this.getName())
                    ),
            },
        ];
    }

    clone(replace?: Replacement) {
        return new Reference(
            this.replaceChild('name', this.name, replace)
        ) as this;
    }

    getName() {
        return this.name.getText();
    }

    computeConflicts(context: Context): Conflict[] {
        const bindOrTypeVar = this.resolve(context);

        const conflicts = [];

        // Is this name undefined in scope?
        if (bindOrTypeVar === undefined) {
            const scope = this.getScope(context);
            conflicts.push(
                new UnknownName(
                    this.name,
                    scope instanceof Type ? scope : undefined
                )
            );
        }
        // Type variables aren't alowed in type variables.
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
                ?.find(
                    (n) =>
                        n instanceof Reaction ||
                        (n instanceof Evaluate &&
                            n.func.getType(context) instanceof
                                StreamDefinitionType)
                );
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
            context.getReferenceType(this) === undefined
        ) {
            // Find any conditionals with type checks that refer to the value bound to this name.
            // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
            const guards = context.source.root
                .getAncestors(this)
                ?.filter(
                    (a) =>
                        a instanceof Conditional &&
                        a.condition.nodes(
                            (n) =>
                                context.source.root.getParent(n) instanceof
                                    Is &&
                                n instanceof Reference &&
                                definition === n.resolve(context)
                        )
                )
                .reverse() as Conditional[];

            // Grab the furthest ancestor and evaluate possible types from there.
            const root = guards[0];
            if (root !== undefined) {
                let possibleTypes = type.getTypeSet(context);
                root.evaluateTypeSet(
                    definition,
                    possibleTypes,
                    possibleTypes,
                    context
                );
            }
        }

        return context.getReferenceType(this) ?? type;
    }

    evaluateTypeSet(
        bind: Bind,
        _: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        // Cache the type of this name at this point in execution.
        if (this.resolve(context) === bind)
            context.setReferenceType(
                this,
                UnionType.getPossibleUnion(context, current.list())
            );

        return current;
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
            new NameException(this.name, undefined, evaluator)
        );
    }

    getStart() {
        return this.name;
    }

    getFinish() {
        return this.name;
    }

    getNodeTranslation(translation: Translation) {
        return translation.nodes.Reference;
    }

    getStartExplanations(translation: Translation, context: Context) {
        return translation.nodes.Reference.start(
            new NodeLink(this.name, translation, context, this.name.getText())
        );
    }

    getGlyphs() {
        return {
            symbols: this.name.getText(),
            emotion: Emotion.Kind,
        };
    }
}
