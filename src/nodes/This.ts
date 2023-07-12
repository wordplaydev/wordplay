import type Conflict from '@conflicts/Conflict';
import type Type from './Type';
import type Value from '@runtime/Value';
import type Step from '@runtime/Step';
import type Bind from './Bind';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import type Expression from './Expression';

import Token from './Token';
import StructureDefinition from './StructureDefinition';
import { MisplacedThis } from '@conflicts/MisplacedThis';
import StructureDefinitionType from './StructureDefinitionType';
import NameException from '@runtime/NameException';
import ConversionDefinition from './ConversionDefinition';
import NumberType from './NumberType';
import StartFinish from '@runtime/StartFinish';
import Reaction from './Reaction';
import ValueException from '@runtime/ValueException';
import type { Replacement } from './Node';
import AtomicExpression from './AtomicExpression';
import type Locale from '@locale/Locale';
import { UnenclosedType } from './UnenclosedType';
import Glyphs from '../lore/Glyphs';
import { PROPERTY_SYMBOL } from '../parser/Symbols';
import TokenType from './TokenType';
import concretize from '../locale/concretize';

type ThisStructure = StructureDefinition | ConversionDefinition | Reaction;

export default class This extends AtomicExpression {
    readonly dis: Token;

    constructor(dis: Token) {
        super();
        this.dis = dis;

        this.computeChildren();
    }

    static make() {
        return new This(new Token(PROPERTY_SYMBOL, TokenType.Access));
    }

    getGrammar() {
        return [{ name: 'dis', types: [Token] }];
    }

    clone(replace?: Replacement) {
        return new This(this.replaceChild('dis', this.dis, replace)) as this;
    }

    getEnclosingStructure(context: Context): ThisStructure | undefined {
        return context
            .getRoot(this)
            ?.getAncestors(this)
            ?.find(
                (a) =>
                    a instanceof StructureDefinition ||
                    a instanceof ConversionDefinition ||
                    a instanceof Reaction
            ) as ThisStructure | undefined;
    }

    computeConflicts(context: Context): Conflict[] {
        // This can only be referenced in the context of a structure or reaction.
        if (this.getEnclosingStructure(context) === undefined)
            return [new MisplacedThis(this)];

        return [];
    }

    computeType(context: Context): Type {
        // The type of this is the structure definition in which this is evaluating.
        const structure = this.getEnclosingStructure(context);
        return structure === undefined
            ? new UnenclosedType(this)
            : // Structure definition's have the structure type
            structure instanceof StructureDefinition
            ? new StructureDefinitionType(structure, [])
            : // Conversion definitions have the input type
            structure instanceof ConversionDefinition
            ? // We strip the unit from this in order to provide a scalar for conversion.
              structure.input instanceof NumberType
                ? NumberType.make()
                : structure.input
            : // Reactions have the reaction's value type
            structure instanceof Reaction
            ? structure.initial.getType(context)
            : new UnenclosedType(this);
    }

    getDependencies(context: Context): Expression[] {
        // This depends on the reaction value it is referenced in.
        const enclosure = this.getEnclosingStructure(context);
        return enclosure ? [enclosure] : [];
    }

    compile(): Step[] {
        // We climb the closure chain finding the first structure.
        return [new StartFinish(this)];
    }

    evaluate(evaluator: Evaluator, prior: Value | undefined): Value {
        if (prior) return prior;

        // If this is in a reaction, it refers to the latest value of the reaction being evaluated.
        const reaction = evaluator
            .getCurrentContext()
            .getRoot(this)
            ?.getAncestors(this)
            .find((n) => n instanceof Reaction) as Reaction | undefined;
        if (reaction) {
            const latestValue = evaluator.getReactionStreamLatest(reaction);
            return latestValue ?? new ValueException(evaluator, reaction);
        }

        // Otherwise, this means something else.
        return (
            evaluator.getThis(this) ??
            new NameException(this, this.dis, undefined, evaluator)
        );
    }

    evaluateTypeSet(
        bind: Bind,
        original: TypeSet,
        current: TypeSet,
        context: Context
    ) {
        bind;
        original;
        context;
        return current;
    }

    getStart() {
        return this.dis;
    }

    getFinish() {
        return this.dis;
    }

    getNodeLocale(translation: Locale) {
        return translation.node.This;
    }

    getStartExplanations(
        translation: Locale,
        context: Context,
        evaluator: Evaluator
    ) {
        return concretize(
            translation,
            translation.node.This.start,
            this.getValueIfDefined(translation, context, evaluator)
        );
    }

    getGlyphs() {
        return Glyphs.This;
    }
}
