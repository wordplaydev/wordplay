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
import NameException from '@values/NameException';
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
        const propertyType = this.reference.getType(context);
        const valueType = this.value.getType(context);

        // If there's a type, the value must match.
        if (!propertyType.accepts(valueType, context))
            return [
                new IncompatibleType(
                    this.reference,
                    propertyType,
                    this,
                    valueType,
                ),
            ];

        return [];
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
            // Copy the structure with the new value
            new Finish(this),
        ];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // Get the new value and the old structure
        const value = evaluator.popValue(this);
        const subject = evaluator.popValue(this);

        if (
            !(subject instanceof StructureValue) ||
            this.reference.name === undefined
        )
            return new ValueException(evaluator, this);

        // Duplicate the structure with the new value on the property.
        const newStructure = subject.withValue(
            this,
            this.reference.name.name.getText(),
            value,
        );

        if (newStructure === undefined)
            return new NameException(
                this.reference,
                this.reference.name.name,
                subject,
                evaluator,
            );

        return newStructure;
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
