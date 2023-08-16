import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Context from './Context';
import type Node from './Node';
import StructureType from './StructureType';
import Bind from './Bind';
import UnionType from './UnionType';
import type TypeSet from './TypeSet';
import Conditional from './Conditional';
import Is from './Is';
import { PROPERTY_SYMBOL } from '@parser/Symbols';
import Sym from './Sym';
import TypeVariable from './TypeVariable';
import NameException from '@values/NameException';
import type Definition from './Definition';
import type Value from '@values/Value';
import StreamType from './StreamType';
import Reference from './Reference';
import NameType from './NameType';
import UnknownNameType from './UnknownNameType';
import { node, type Grammar, type Replacement } from './Node';
import type Locale from '@locale/Locale';
import NodeRef from '@locale/NodeRef';
import Glyphs from '../lore/Glyphs';
import UnimplementedException from '../values/UnimplementedException';
import Purpose from '../concepts/Purpose';
import { UnknownName } from '../conflicts/UnknownName';
import concretize from '../locale/concretize';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Refer from '../edit/Refer';
import FunctionDefinition from './FunctionDefinition';
import BasisType from './BasisType';

export default class PropertyReference extends Expression {
    readonly structure: Expression;
    readonly dot: Token;
    readonly name?: Reference;

    constructor(subject: Expression, dot: Token, name?: Reference) {
        super();

        this.structure = subject;
        this.dot = dot;
        this.name = name;

        this.computeChildren();
    }

    static make(subject: Expression, name?: Reference) {
        return new PropertyReference(
            subject,
            new Token(PROPERTY_SYMBOL, Sym.Access),
            name
        );
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean,
        context: Context
    ) {
        if (!selected)
            return [
                PropertyReference.make(ExpressionPlaceholder.make(), undefined),
            ];
        else if (node instanceof PropertyReference) {
            const selectionType = node.structure.getType(context);
            const definition =
                selectionType instanceof StructureType
                    ? selectionType.structure
                    : selectionType instanceof BasisType
                    ? context
                          .getBasis()
                          .getStructureDefinition(
                              selectionType.getBasisTypeName()
                          )
                    : undefined;
            // Is the type a structure? Suggest reference to it's properties.
            if (definition) {
                const prefix = node.name?.getName() ?? '';
                return (
                    definition
                        .getDefinitions(node)
                        // Filter my matching prefixes
                        .filter((def) =>
                            def
                                .getNames()
                                .some((name) => name.startsWith(prefix))
                        )
                        .map((def) =>
                            // Bind with matching type? Generate a PropertyReference to it.
                            def instanceof Bind &&
                            (type === undefined ||
                                type.accepts(def.getType(context), context))
                                ? new Refer(
                                      (name: string) =>
                                          PropertyReference.make(
                                              node.structure,
                                              Reference.make(name)
                                          ),
                                      def
                                  )
                                : // Function with a matching type? Generate an (Binary/Unary)Evaluate to it.
                                def instanceof FunctionDefinition &&
                                  (type === undefined ||
                                      type.accepts(
                                          def.getOutputType(context),
                                          context
                                      ))
                                ? new Refer(
                                      (name) =>
                                          def.getEvaluateTemplate(
                                              name,
                                              context,
                                              node.structure
                                          ),
                                      def
                                  )
                                : undefined
                        )
                        .filter((node): node is Refer => node !== undefined)
                );
            }
        }

        return [];
    }

    getGrammar(): Grammar {
        return [
            { name: 'structure', kind: node(Expression) },
            { name: 'dot', kind: node(Sym.Access) },
            {
                name: 'name',
                kind: node(Reference),
                // The label is
                label: (translation: Locale) =>
                    translation.node.PropertyReference.property,
                // The valid definitions of the name are based on the referenced structure type, prefix filtered by whatever name is already provided.
                getDefinitions: (context: Context) => {
                    let defs = this.getDefinitions(this, context);
                    if (this.name && !this.name.isPlaceholder())
                        defs = defs.filter((def) =>
                            def
                                .getNames()
                                .some(
                                    (name) =>
                                        this.name &&
                                        name.startsWith(this.name.getName())
                                )
                        );
                    return defs;
                },
            },
        ];
    }

    clone(replace?: Replacement) {
        return new PropertyReference(
            this.replaceChild('structure', this.structure, replace),
            this.replaceChild('dot', this.dot, replace),
            this.replaceChild('name', this.name, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Bind;
    }

    computeConflicts(context: Context): Conflict[] {
        return this.name !== undefined
            ? []
            : [new UnknownName(this.dot, this.getSubjectType(context))];
    }

    getScopeOfChild(child: Node, context: Context): Node | undefined {
        // The name's scope is the structure referred to in the subject expression.
        // The subject expression's scope is this property reference's parent.
        if (child === this.name) return this.getSubjectType(context);
        else return this.getParent(context);
    }

    getDefinitions(node: Node, context: Context): Definition[] {
        const subjectType = this.getSubjectType(context);

        if (subjectType instanceof StructureType)
            return subjectType.structure.getDefinitions(node);
        else return subjectType.getDefinitions(node, context);
    }

    resolve(context: Context): Definition | undefined {
        if (this.name === undefined) return undefined;

        const subjectType = this.getSubjectType(context);

        if (subjectType instanceof StructureType)
            return subjectType.getDefinition(this.name.getName());
        else
            return subjectType.getDefinitionOfNameInScope(
                this.name.getName(),
                context
            );
    }

    getSubjectType(context: Context): Type {
        let structureType = this.structure.getType(context);
        // If it's a stream, get the type of the stream, since streams are evaluated to their values, not themselves.
        if (structureType instanceof StreamType)
            structureType = structureType.type;
        return structureType;
    }

    computeType(context: Context): Type {
        // Get the structure type
        const subjectType = this.getSubjectType(context);

        // Get the definition.
        const def = this.resolve(context);

        // No definition? Unknown type.
        if (def === undefined || def instanceof TypeVariable)
            return new UnknownNameType(this, this.name?.name, subjectType);

        // Get the type of the definition.
        let type = def.getType(context);

        if (def instanceof Bind && this.name) {
            if (type instanceof NameType) {
                const bindType = type.resolve(context);
                if (
                    bindType instanceof TypeVariable &&
                    subjectType instanceof StructureType
                ) {
                    const typeInput = subjectType.resolveTypeVariable(
                        bindType.getNames()[0]
                    );
                    if (typeInput) type = typeInput;
                }
            }

            // Narrow the type if it's a union.

            // Is the type a union? Find the subset of types that are feasible, given any type checks in conditionals.
            if (
                type instanceof UnionType &&
                context.getReferenceType(this) === undefined
            ) {
                // Find any conditionals with type checks that refer to the value bound to this name.
                // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
                const guards = context
                    .getRoot(this)
                    ?.getAncestors(this)
                    ?.filter(
                        (a): a is Conditional =>
                            // Guards must be conditionals
                            a instanceof Conditional &&
                            // Guards must have references to this same property in a type check
                            a.condition.nodes(
                                (n): n is PropertyReference =>
                                    this.name !== undefined &&
                                    context.source.root.getParent(n) instanceof
                                        Is &&
                                    n instanceof PropertyReference &&
                                    n.getSubjectType(context) instanceof
                                        StructureType &&
                                    def ===
                                        (
                                            n.getSubjectType(
                                                context
                                            ) as StructureType
                                        ).getDefinition(this.name.getName())
                            ).length > 0
                    )
                    .reverse();

                // Grab the furthest ancestor and evaluate possible types from there.
                const root =
                    guards !== undefined && guards.length > 0
                        ? guards[0]
                        : undefined;
                if (root !== undefined) {
                    const possibleTypes = type.getTypeSet(context);
                    root.evaluateTypeSet(
                        def,
                        possibleTypes,
                        possibleTypes,
                        context
                    );
                }
            }

            // Did we manage to capture a guard narrowed type? Use it instead.
            type = context.getReferenceType(this) ?? type;
        }
        return type;
    }

    getDependencies(): Expression[] {
        return [this.structure];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            ...this.structure.compile(context),
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        const subject = evaluator.popValue(this);
        if (this.name === undefined)
            return new NameException(this, undefined, subject, evaluator);
        else if (this.name.isPlaceholder())
            return new UnimplementedException(evaluator, this.name);

        const name = this.name.getName();
        return (
            subject.resolve(name, evaluator) ??
            new NameException(this.name, this.name.name, subject, evaluator)
        );
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        // Filter the types of the structure.
        const possibleTypes = this.structure.evaluateTypeSet(
            bind,
            original,
            current,
            context
        );
        if (this.resolve(context) === bind)
            context.setReferenceType(
                this,
                UnionType.getPossibleUnion(context, possibleTypes.list())
            );
        return current;
    }

    getStart() {
        return this.dot;
    }
    getFinish() {
        return this.name ?? this.dot;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.PropertyReference;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.PropertyReference.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.PropertyReference.finish,
            this.name
                ? new NodeRef(this.name, locale, context, this.name?.getName())
                : undefined,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Reference;
    }

    getDescriptionInputs(locale: Locale, context: Context) {
        return [
            this.name ? new NodeRef(this.name, locale, context) : undefined,
        ];
    }
}
