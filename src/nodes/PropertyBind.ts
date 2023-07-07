import type Conflict from '@conflicts/Conflict';
import Expression from './Expression';
import Token from './Token';
import type Type from './Type';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import Start from '@runtime/Start';
import Finish from '@runtime/Finish';
import type Context from './Context';
import type Bind from './Bind';
import type TypeSet from './TypeSet';
import NameException from '@runtime/NameException';
import type Value from '@runtime/Value';
import type { Replacement } from './Node';
import type Locale from '@locale/Locale';
import BindToken from './BindToken';
import Structure from '../runtime/Structure';
import ValueException from '../runtime/ValueException';
import PropertyReference from './PropertyReference';
import IncompatibleBind from '../conflicts/IncompatibleBind';
import Glyphs from '../lore/Glyphs';
import Purpose from '../concepts/Purpose';
import concretize from '../locale/locales/concretize';

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

    static make(reference: PropertyReference, name: string, value: Expression) {
        return new PropertyBind(reference, new BindToken(), value);
    }

    getGrammar() {
        return [
            { name: 'reference', types: [PropertyReference] },
            { name: 'bind', types: [Token] },
            { name: 'value', types: [Expression] },
        ];
    }

    clone(replace?: Replacement) {
        return new PropertyBind(
            this.replaceChild('reference', this.reference, replace),
            this.replaceChild('bind', this.bind, replace),
            this.replaceChild('value', this.value, replace)
        ) as this;
    }

    getPurpose() {
        return Purpose.Store;
    }

    computeConflicts(context: Context): Conflict[] {
        // The type of the corresponding bind must accept the type of the value.
        const propertyType = this.reference.getType(context);
        const valueType = this.value.getType(context);

        // If there's a type, the value must match.
        if (!propertyType.accepts(valueType, context))
            return [new IncompatibleBind(propertyType, this, valueType)];

        return [];
    }

    /** The type of a property bind is the type of the subject, since property binds clone a structure. */
    computeType(context: Context): Type {
        return this.reference.getSubjectType(context);
    }

    getDependencies(): Expression[] {
        return [this.reference, this.value];
    }

    compile(context: Context): Step[] {
        return [
            new Start(this),
            // Evaluate the structure
            ...this.reference.structure.compile(context),
            // Evaluate the value
            ...this.value.compile(context),
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
            !(subject instanceof Structure) ||
            this.reference.name === undefined
        )
            return new ValueException(evaluator, this);

        // Duplicate the structure with the new value on the property.
        const newStructure = subject.withValue(
            this,
            this.reference.name.name.getText(),
            value
        );

        if (newStructure === undefined)
            return new NameException(
                this.reference.name.name,
                subject,
                evaluator
            );

        return newStructure;
    }

    evaluateTypeSet(_: Bind, __: TypeSet, current: TypeSet) {
        return current;
    }

    getStart() {
        return this.reference;
    }
    getFinish() {
        return this.bind;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.PropertyBind;
    }

    getStartExplanations(locale: Locale) {
        return concretize(locale, locale.node.PropertyBind.start);
    }

    getFinishExplanations(
        locale: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            locale,
            locale.node.PropertyBind.finish,
            this.getValueIfDefined(locale, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.Bind;
    }
}
