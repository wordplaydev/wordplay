import type Conflict from '@conflicts/Conflict';
import type { InsertContext, ReplaceContext } from '@edit/revision/EditContext';
import Refer from '@edit/revision/Refer';
import type LocaleText from '@locale/LocaleText';
import NodeRef from '@locale/NodeRef';
import type { NodeDescriptor } from '@locale/NodeTexts';
import { PROPERTY_SYMBOL } from '@parser/Symbols';
import type Evaluator from '@runtime/Evaluator';
import Finish from '@runtime/Finish';
import Start from '@runtime/Start';
import type Step from '@runtime/Step';
import NameException from '@values/NameException';
import type Value from '@values/Value';
import Purpose from '../concepts/Purpose';
import { UnknownName } from '../conflicts/UnknownName';
import type Locales from '../locale/Locales';
import Characters from '../lore/BasisCharacters';
import UnimplementedException from '../values/UnimplementedException';
import BasisType from './BasisType';
import Bind from './Bind';
import type Context from './Context';
import type Definition from './Definition';
import Expression, { type GuardContext } from './Expression';
import FunctionDefinition from './FunctionDefinition';
import getGuards from './getGuards';
import NameType from './NameType';
import type Node from './Node';
import { node, type Grammar, type Replacement } from './Node';
import Reference from './Reference';
import StreamType from './StreamType';
import StructureType from './StructureType';
import Sym from './Sym';
import Token from './Token';
import type Type from './Type';
import type TypeSet from './TypeSet';
import TypeVariable from './TypeVariable';
import UnionType from './UnionType';
import UnknownNameType from './UnknownNameType';

export default class PropertyReference extends Expression {
    readonly structure: Expression;
    readonly dot: Token;
    readonly name: Reference | undefined;

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
            name,
        );
    }

    static getPossibleReferences(
        type: Type | undefined,
        node: Node | undefined,
        context: Context,
    ) {
        if (node instanceof PropertyReference) {
            const selectionType = node.structure.getType(context);
            const definition =
                selectionType instanceof StructureType
                    ? selectionType.definition
                    : selectionType instanceof BasisType
                      ? context
                            .getBasis()
                            .getStructureDefinition(
                                selectionType.getBasisTypeName(),
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
                                .some((name) => name.startsWith(prefix)),
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
                                              Reference.make(name),
                                          ),
                                      def,
                                  )
                                : // Function with a matching type? Generate an (Binary/Unary)Evaluate to it.
                                  def instanceof FunctionDefinition &&
                                    (type === undefined ||
                                        type.accepts(
                                            def.getOutputType(context),
                                            context,
                                        ))
                                  ? new Refer(
                                        (name) =>
                                            def.getEvaluateTemplate(
                                                name,
                                                context,
                                                node.structure,
                                            ),
                                        def,
                                    )
                                  : undefined,
                        )
                        .filter((node): node is Refer => node !== undefined)
                );
            }
        }

        return [];
    }

    static getPossibleReplacements({ type, node, context }: ReplaceContext) {
        return this.getPossibleReferences(type, node, context);
    }

    static getPossibleInsertions({ type, parent, context }: InsertContext) {
        return this.getPossibleReferences(type, parent, context);
    }

    getDescriptor(): NodeDescriptor {
        return 'PropertyReference';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'structure',
                kind: node(Expression),
                label: (locales, context) => {
                    return () => this.getSubjectType(context).getLabel(locales);
                },
            },
            { name: 'dot', kind: node(Sym.Access), label: undefined },
            {
                name: 'name',
                kind: node(Reference),
                // The label is
                label: () => (l) => l.node.PropertyReference.label.property,
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
                                        name.startsWith(this.name.getName()),
                                ),
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
            this.replaceChild('name', this.name, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Definitions;
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
            return subjectType.definition.getDefinitions(node);
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
                context,
            );
    }

    getSubjectType(context: Context): Type {
        let structureType = this.structure.getType(context);
        // If it's a stream, get the type of the stream, since streams are evaluated to their values, not themselves.
        if (structureType instanceof StreamType)
            structureType = structureType.type;
        return structureType;
    }

    getTypeGuardKey() {
        return 'this';
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
                        bindType.getNames()[0],
                    );
                    if (typeInput) type = typeInput;
                }
            }

            // Narrow the type if it's a union.

            // Is the type a union? Find the subset of types that are feasible, given any type checks in conditionals.
            if (
                type instanceof UnionType &&
                context.getReferenceType(this, this.getTypeGuardKey()) ===
                    undefined
            ) {
                // Find any conditionals with type checks that refer to the value bound to this name.
                // Reverse them so they are in furthest to nearest ancestor, so we narrow types in execution order.
                const guards = getGuards(this, context, (n) => {
                    // This reference has a name
                    if (
                        this.name !== undefined &&
                        // The candidate node is also a PropertyReference
                        n instanceof PropertyReference &&
                        // It refers to the same definition as this reference's name.
                        n.getSubjectType(context) instanceof StructureType &&
                        def ===
                            (
                                n.getSubjectType(context) as StructureType
                            ).getDefinition(this.name.getName())
                    ) {
                        const parent = context.source.root.getParent(n);
                        return (
                            parent instanceof Expression && parent.guardsTypes()
                        );
                    } else return false;
                });

                // Grab the furthest ancestor and evaluate possible types from there.
                const root =
                    guards !== undefined && guards.length > 0
                        ? guards[0]
                        : undefined;
                if (root !== undefined) {
                    const possibleTypes = type.getTypeSet(context);
                    root.evaluateTypeGuards(possibleTypes, {
                        bind: def,
                        key: this.getTypeGuardKey(),
                        original: possibleTypes,
                        context,
                    });
                }
            }

            // Did we manage to capture a guard narrowed type? Use it instead.
            type =
                context.getReferenceType(this, this.getTypeGuardKey()) ?? type;
        }
        return type;
    }

    getDependencies(): Expression[] {
        return [this.structure];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            ...this.structure.compile(evaluator, context),
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

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        // Filter the types of the structure.
        const possibleTypes = this.structure.evaluateTypeGuards(current, guard);
        if (
            this.resolve(guard.context) === guard.bind &&
            guard.key === this.getTypeGuardKey()
        )
            guard.context.setReferenceType(
                this,
                this.getTypeGuardKey(),
                UnionType.getPossibleUnion(guard.context, possibleTypes.list()),
            );
        return current;
    }

    isGuardMatch(guard: GuardContext): boolean {
        const subjectType = this.getSubjectType(guard.context);
        return (
            this.name !== undefined &&
            this.getTypeGuardKey() === guard.key &&
            subjectType instanceof StructureType &&
            guard.bind === subjectType.getDefinition(this.name.getName())
        );
    }

    getStart() {
        return this.dot;
    }

    getFinish() {
        return this.name ?? this.dot;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PropertyReference;
    getLocalePath() {
        return PropertyReference.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.PropertyReference.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.PropertyReference.finish,
            this.name
                ? new NodeRef(this.name, locales, context, this.name?.getName())
                : undefined,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getCharacter() {
        return Characters.Reference;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            this.name ? new NodeRef(this.name, locales, context) : undefined,
        ];
    }
}
