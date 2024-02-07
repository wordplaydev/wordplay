import type Conflict from '@conflicts/Conflict';
import type Type from './Type';
import type Value from '@values/Value';
import type Step from '@runtime/Step';
import type Context from './Context';
import type TypeSet from './TypeSet';
import type Evaluator from '@runtime/Evaluator';
import type Expression from './Expression';

import Token from './Token';
import StructureDefinition from './StructureDefinition';
import { MisplacedThis } from '@conflicts/MisplacedThis';
import StructureType from './StructureType';
import NameException from '@values/NameException';
import ConversionDefinition from './ConversionDefinition';
import NumberType from './NumberType';
import StartFinish from '@runtime/StartFinish';
import Reaction from './Reaction';
import ValueException from '@values/ValueException';
import { node, type Grammar, type Replacement } from './Node';
import SimpleExpression from './SimpleExpression';
import { UnenclosedType } from './UnenclosedType';
import Glyphs from '../lore/Glyphs';
import { PROPERTY_SYMBOL } from '../parser/Symbols';
import Sym from './Sym';
import concretize from '../locale/concretize';
import type Node from './Node';
import Purpose from '../concepts/Purpose';
import type Locales from '../locale/Locales';

type ThisStructure = StructureDefinition | ConversionDefinition | Reaction;

export default class This extends SimpleExpression {
    readonly dis: Token;

    constructor(dis: Token) {
        super();
        this.dis = dis;

        this.computeChildren();
    }

    static make() {
        return new This(new Token(PROPERTY_SYMBOL, Sym.Access));
    }

    static getPossibleNodes(
        type: Type | undefined,
        node: Node,
        selected: boolean,
        context: Context,
    ) {
        return context
            .getRoot(node)
            ?.getAncestors(node)
            .some(
                (a) =>
                    a instanceof StructureDefinition ||
                    a instanceof ConversionDefinition ||
                    a instanceof Reaction,
            )
            ? [This.make()]
            : [];
    }

    getDescriptor() {
        return 'This';
    }

    getGrammar(): Grammar {
        return [{ name: 'dis', kind: node(Sym.This) }];
    }

    getPurpose() {
        return Purpose.Bind;
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
                    a instanceof Reaction,
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
              ? new StructureType(structure, [])
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
            const latestValue = evaluator.getStreamFor(reaction)?.latest();
            return latestValue ?? new ValueException(evaluator, reaction);
        }

        // Otherwise, this means something else.
        return (
            evaluator.getThis(this) ??
            new NameException(this, this.dis, undefined, evaluator)
        );
    }

    evaluateTypeGuards(current: TypeSet) {
        return current;
    }

    getStart() {
        return this.dis;
    }

    getFinish() {
        return this.dis;
    }

    getNodeLocale(locales: Locales) {
        return locales.get((l) => l.node.This);
    }

    getStartExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return concretize(
            locales,
            locales.get((l) => l.node.This.start),
            this.getValueIfDefined(locales, context, evaluator),
        );
    }

    getGlyphs() {
        return Glyphs.This;
    }
}
