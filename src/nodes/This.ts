import type Conflict from '@conflicts/Conflict';
import type Evaluator from '@runtime/Evaluator';
import type Step from '@runtime/Step';
import type Value from '@values/Value';
import type Context from '@nodes/Context';
import type Expression from '@nodes/Expression';
import type Type from '@nodes/Type';
import type TypeSet from '@nodes/TypeSet';

import { MisplacedThis } from '@conflicts/MisplacedThis';
import type {
    InsertContext,
    ReplaceContext,
} from '@edit/revision/EditContext';
import type LocaleText from '@locale/LocaleText';
import type { NodeDescriptor } from '@locale/NodeTexts';
import StartFinish from '@runtime/StartFinish';
import NameException from '@values/NameException';
import ValueException from '@values/ValueException';
import { Purpose } from '@concepts/Purpose';
import type Locales from '@locale/Locales';
import Characters from '../lore/BasisCharacters';
import { PROPERTY_SYMBOL, THIS_SYMBOL } from '@parser/Symbols';
import ConversionDefinition from '@nodes/ConversionDefinition';
import Node, { node, type Grammar, type Replacement } from '@nodes/Node';
import NumberType from '@nodes/NumberType';
import Reaction from '@nodes/Reaction';
import SimpleExpression from '@nodes/SimpleExpression';
import StructureDefinition from '@nodes/StructureDefinition';
import StructureType from '@nodes/StructureType';
import { Sym } from '@nodes/Sym';
import Translate from '@nodes/Translate';
import Token from '@nodes/Token';
import { UnenclosedType } from '@nodes/UnenclosedType';

type ThisStructure =
    | StructureDefinition
    | ConversionDefinition
    | Reaction
    | Translate;

/** The four constructs in which `⬚` (This) is a valid reference. */
function isThisStructure(node: Node): node is ThisStructure {
    return (
        node instanceof StructureDefinition ||
        node instanceof ConversionDefinition ||
        node instanceof Reaction ||
        node instanceof Translate
    );
}

export default class This extends SimpleExpression {
    readonly dis: Token;

    constructor(dis: Token) {
        super();
        this.dis = dis;

        this.computeChildren();
    }

    static make() {
        return new This(new Token(THIS_SYMBOL, Sym.This));
    }

    static getPossibleReplacements({ node, context }: ReplaceContext) {
        return (context.getRoot(node)?.getAncestors(node) ?? []).some(
            isThisStructure,
        )
            ? [This.make()]
            : [];
    }

    static getPossibleInsertions({ parent, context }: InsertContext) {
        // `⬚` can be inserted wherever it's valid: when the insertion parent is,
        // or is inside, a structure, conversion, reaction, or translate.
        return [
            parent,
            ...(context.getRoot(parent)?.getAncestors(parent) ?? []),
        ].some(isThisStructure)
            ? [This.make()]
            : [];
    }

    getDescriptor(): NodeDescriptor {
        return 'This';
    }

    getGrammar(): Grammar {
        return [{ name: 'dis', kind: node(Sym.This), label: undefined }];
    }

    getPurpose() {
        return Purpose.Definitions;
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
                    a instanceof Reaction ||
                    a instanceof Translate,
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
            : // Translates have the type of the item being translated.
              structure instanceof Translate
              ? structure.getItemType(context)
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

        // If this is inside a translate (↦), it refers to the current item being translated,
        // bound under the property symbol by the translate's iteration.
        if (
            this.getEnclosingStructure(evaluator.getCurrentContext()) instanceof
            Translate
        )
            return (
                evaluator.resolve(PROPERTY_SYMBOL) ??
                new ValueException(evaluator, this)
            );

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

    static readonly LocalePath = (l: LocaleText) => l.node.This;
    getLocalePath() {
        return This.LocalePath;
    }

    getStartExplanations(
        locales: Locales,
        context: Context,
        evaluator: Evaluator,
    ) {
        return locales.concretize(
            (l) => l.node.This.start,
            {
                value: this.getValueIfDefined(locales, context, evaluator),
            },
        );
    }

    getCharacter() {
        return Characters.This;
    }
}
