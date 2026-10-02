import type Conflict from '#conflicts/Conflict.ts';
import { allDefined } from '#util/nullable.ts';
import InvalidProperty from '#conflicts/InvalidProperty.ts';
import type LocaleText from '#locale/LocaleText.ts';
import type { NodeDescriptor } from '#locale/NodeTexts.ts';
import Evaluation from '#runtime/Evaluation.ts';
import type Evaluator from '#runtime/Evaluator.ts';
import Finish from '#runtime/Finish.ts';
import Start from '#runtime/Start.ts';
import StartEvaluation from '#runtime/StartEvaluation.ts';
import type Step from '#runtime/Step.ts';
import ExceptionValue from '#values/ExceptionValue.ts';
import type Value from '#values/Value.ts';
import { Purpose } from '#concepts/Purpose.ts';
import IncompatibleType from '#conflicts/IncompatibleType.ts';
import type Locales from '#locale/Locales.ts';
import NodeRef from '#locale/NodeRef.ts';
import Characters from '../lore/BasisCharacters';
import StructureValue from '#values/StructureValue.ts';
import ValueException from '#values/ValueException.ts';
import type { ReplaceContext } from '#edit/revision/EditContext.ts';
import { PLACEHOLDER_SYMBOL } from '#parser/Symbols.ts';
import Bind from '#nodes/Bind.ts';
import ExpressionPlaceholder from '#nodes/ExpressionPlaceholder.ts';
import Reference from '#nodes/Reference.ts';
import BindToken from '#nodes/BindToken.ts';
import type Context from '#nodes/Context.ts';
import { buildBindings } from '#nodes/Evaluate.ts';
import Expression, { type GuardContext } from '#nodes/Expression.ts';
import { node, type Grammar, type Replacement } from '#nodes/Node.ts';
import PropertyReference from '#nodes/PropertyReference.ts';
import StructureDefinitionType from '#nodes/StructureDefinitionType.ts';
import { Sym } from '#nodes/Sym.ts';
import type Token from '#nodes/Token.ts';
import type Type from '#nodes/Type.ts';
import type TypeSet from '#nodes/TypeSet.ts';

export default class PropertyBind extends Expression {
    readonly reference: PropertyReference;
    readonly bind: Token;
    readonly value: Expression;

    constructor(reference: PropertyReference, bind: Token, value: Expression) {
        super();

        this.reference = reference;
        this.bind = bind;
        this.value = value;

        this.computeChildren();
    }

    static make(reference: PropertyReference, value: Expression) {
        return new PropertyBind(reference, BindToken(), value);
    }

    /** Offer to turn a property reference into a property bind, and offer a template wherever
     * an expression fits, so the construct is reachable from the menu, not just the palette. */
    static getPossibleReplacements({ node }: ReplaceContext) {
        return node instanceof PropertyReference
            ? [PropertyBind.make(node, ExpressionPlaceholder.make())]
            : [];
    }

    static getPossibleInsertions() {
        return [
            PropertyBind.make(
                PropertyReference.make(
                    ExpressionPlaceholder.make(),
                    Reference.make(PLACEHOLDER_SYMBOL),
                ),
                ExpressionPlaceholder.make(),
            ),
        ];
    }

    getDescriptor(): NodeDescriptor {
        return 'PropertyBind';
    }

    getGrammar(): Grammar {
        return [
            {
                name: 'reference',
                kind: node(PropertyReference),
                label: () => (l) => l.node.PropertyBind.label.property,
            },
            { name: 'bind', kind: node(Sym.Bind), label: undefined },
            {
                name: 'value',
                kind: node(Expression),
                label: () => (l) => l.node.PropertyBind.label.value,
            },
        ];
    }

    clone(replace?: Replacement) {
        return this.cloned(
            new PropertyBind(
                this.replaceChild('reference', this.reference, replace),
                this.replaceChild('bind', this.bind, replace),
                this.replaceChild('value', this.value, replace),
            ),
        );
    }

    getPurpose() {
        return Purpose.Definitions;
    }

    computeConflicts(context: Context): Conflict[] {
        // The type of the corresponding bind must accept the type of the value.
        const structureType = this.reference.getSubjectType(context);
        const propertyType = this.reference.getType(context);
        const valueType = this.value.getType(context);

        const conflicts: Conflict[] = [];

        // If there's a type, the value must match.
        if (
            !context.isUnknownDownstream(this.value) &&
            !propertyType.accepts(valueType, context)
        )
            conflicts.push(
                new IncompatibleType(
                    this.reference,
                    propertyType,
                    this,
                    valueType,
                ),
            );

        // If the property mentioned isn't an input, it's a conflict.
        const bind = this.reference.resolve(context);
        if (
            bind instanceof Bind &&
            structureType instanceof StructureDefinitionType &&
            !structureType.type.definition.inputs.some((input) =>
                input.names.sharesName(bind.names),
            )
        )
            conflicts.push(
                new InvalidProperty(structureType.type.definition, this),
            );

        return conflicts;
    }

    /** The type of a property bind is the type of the subject, since property binds clone a structure. */
    computeType(context: Context): Type {
        return this.reference.getSubjectType(context);
    }

    getDependencies(): Expression[] {
        return [this.reference, this.value];
    }

    compile(evaluator: Evaluator, context: Context): Step[] {
        return [
            new Start(this),
            // Evaluate the structure
            ...this.reference.structure.compile(evaluator, context),
            // Evaluate the value
            ...this.value.compile(evaluator, context),
            // Start the evaluation
            new StartEvaluation(this),
            // Copy the structure with the new value
            new Finish(this),
        ];
    }

    startEvaluation(evaluator: Evaluator) {
        // Get the new value and the old structure
        const value = evaluator.popValue(this);
        const subject = evaluator.popValue(this);

        // Subject isn't a structure? Exception.
        if (
            !(subject instanceof StructureValue) ||
            this.reference.name === undefined
        )
            return new ValueException(evaluator, this);

        // What structure definition are we recreating?
        const definition = subject.type;

        // Build a list of values to pass to the definition, but with the new value.
        const values = definition.inputs.map((input) =>
            this.reference.name &&
            input.names.hasName(this.reference.name.getName())
                ? value
                : subject.resolve(input.names),
        );

        if (!allDefined(values)) return new ValueException(evaluator, this);

        const bindings = buildBindings(
            evaluator,
            definition.inputs,
            values,
            this,
        );
        if (bindings instanceof ExceptionValue) return bindings;

        evaluator.startEvaluation(
            new Evaluation(
                evaluator,
                this,
                definition,
                evaluator.getCurrentEvaluation(),
                bindings,
            ),
        );
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        return evaluator.popValue(this);
    }

    evaluateTypeGuards(current: TypeSet, guard: GuardContext) {
        this.reference.evaluateTypeGuards(current, guard);
        this.value.evaluateTypeGuards(current, guard);
        return current;
    }

    getStart() {
        return this.reference;
    }
    getFinish() {
        return this.bind;
    }

    static readonly LocalePath = (l: LocaleText) => l.node.PropertyBind;
    getLocalePath() {
        return PropertyBind.LocalePath;
    }

    getStartExplanations(locales: Locales) {
        return locales.concretize((l) => l.node.PropertyBind.start);
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize((l) => l.node.PropertyBind.finish, {
            property: this.reference.name
                ? new NodeRef(this.reference.name, locales, context)
                : undefined,
            value: this.getValueIfDefined(locales, context, evaluator),
        });
    }

    getCharacter() {
        return Characters.Bind;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        // Prefer the resolved definition's non-symbolic name over the raw
        // source text, which may be an emoji alias.
        const definition = this.reference.resolve(context);
        return {
            name: definition
                ? locales.getDescriptiveName(definition.names)
                : this.reference.name?.getName(),
        };
    }
}
