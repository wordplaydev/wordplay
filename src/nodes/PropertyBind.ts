import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import type Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Value from '@values/Value';
import { node, type Grammar, type Replacement } from './Node';
import BindToken from './BindToken';
import StructureValue from '../values/StructureValue';
import ValueException from '../values/ValueException';
import PropertyReference from './PropertyReference';
import IncompatibleType from '../conflicts/IncompatibleType';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/concretize';
import NodeRef from '../locale/NodeRef';
import Sym from './Sym';
import ExpressionPlaceholder from './ExpressionPlaceholder';
import Reference from './Reference';
import type Node from './Node';
import type Locales from '../locale/Locales';
import { buildBindings } from './Evaluate';
import ExceptionValue from '@values/ExceptionValue';
import Evaluation from '@runtime/Evaluation';
import StartEvaluation from '@runtime/StartEvaluation';
import Bind from './Bind';
import InvalidProperty from '@conflicts/InvalidProperty';
import StructureDefinitionType from './StructureDefinitionType';

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
        return new PropertyBind(reference, new BindToken(), value);
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean,
    ) {
        return [
            node instanceof PropertyReference && selected
                ? PropertyBind.make(node, ExpressionPlaceholder.make(type))
                : PropertyBind.make(
                      PropertyReference.make(
                          ExpressionPlaceholder.make(),
                          Reference.make('_'),
                      ),
                      ExpressionPlaceholder.make(type),
                  ),
        ];
    }

    getDescriptor() {
        return 'PropertyBind';
    }

    getGrammar(): Grammar {
        return [
            { name: 'reference', kind: node(PropertyReference) },
            { name: 'bind', kind: node(Sym.Bind) },
            { name: 'value', kind: node(Expression) },
        ];
    }

    clone(replace?: Replacement) {
        return new PropertyBind(
            this.replaceChild('reference', this.reference, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('value', this.value, replace),
        ) as this;
    }

    getPurpose() {
        return Purpose.Bind;
    }

    computeConflicts(context: Context): Conflict[] {
        // The type of the corresponding bind must accept the type of the value.
        const structureType = this.reference.getSubjectType(context);
        const propertyType = this.reference.getType(context);
        const valueType = this.value.getType(context);

        const conflicts: Conflict[] = [];

        // If there's a type, the value must match.
        if (!propertyType.accepts(valueType, context))
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

        if (values.includes(undefined))
            return new ValueException(evaluator, this);

        const bindings = buildBindings(
            evaluator,
            definition.inputs,
            values as Value[],
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

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.reference;
    }
    getFinish() {
        return this.bind;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.PropertyBind);
    }

    getStartExplanations(locales: Locales) {
        return concretize(
            locales,
            locales.get((l) => l.node.PropertyBind.start),
        );
    }

    getFinishExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.PropertyBind.finish),
            this.reference.name
                ? new NodeRef(this.reference.name, locales, context)
                : undefined,
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.Bind;
    }

    getDescriptionInputs(locales: Locales, context: Context) {
        return [
            this.reference.name
                ? new NodeRef(this.reference.name, locales, context)
                : undefined,
        ];
    }
}
