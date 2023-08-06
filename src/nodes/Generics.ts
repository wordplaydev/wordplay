import BinaryEvaluate from './BinaryEvaluate';
import Bind from './Bind';
import type Context from './Context';
import Evaluate from './Evaluate';
import Expression from './Expression';
import type FunctionDefinition from './FunctionDefinition';
import FunctionType from './FunctionType';
import NumberType from './NumberType';
import NameType from './NameType';
import PropertyReference from './PropertyReference';
import StreamDefinition from './StreamDefinition';
import StructureDefinition from './StructureDefinition';
import type Type from './Type';
import TypeVariable from './TypeVariable';
import type UnaryEvaluate from './UnaryEvaluate';
import { UnknownVariableType } from './UnknownVariableType';
import type ConversionDefinition from './ConversionDefinition';
import type Convert from './Convert';

export type EvaluationType = Evaluate | BinaryEvaluate | UnaryEvaluate;

/**
 * Find all abstract types in the given bind's type and construct a type that replaces all of them with concrete types,
 * using the information in the given evaluation.
 *
 * @param definition The function or structure definition that potentially defines type variables that need to be concretized in the given evaluation.
 * @param input The bind on the definition whose concrete type we want, or undefined if we're trying to get the definition's output.
 * @param evaluation The node that is evaluating the given definition.
 * @param context The context in which we're evaluating types.
 */
export default function getConcreteExpectedType(
    definition: FunctionDefinition | StructureDefinition | StreamDefinition,
    input: Bind | undefined,
    evaluation: EvaluationType,
    context: Context
): Type {
    let type;
    // If the input is undefined, we're getting the output type of the function or structure.
    if (input === undefined) {
        if (definition instanceof StructureDefinition)
            return definition.getType(context);
        const functionType = definition.getType(context);
        if (
            !(
                functionType instanceof FunctionType &&
                functionType.definition !== undefined
            )
        )
            return new UnknownVariableType(evaluation);
        type = functionType.output;
    }
    // Otherwise, check that the bind actually exists
    else {
        // Verify that the bind provided exists on the given evaluate.
        if (!definition.inputs.includes(input))
            throw Error(
                "The Bind given doesn't exist on this function or structure. Something is broken!"
            );
        // Get the bind's type, resolving any non-type variable references and converting any type variables to variable types.
        type = input.getType(context);
    }

    // If the type is a type variable name, concretize it using the evaluation.
    if (type instanceof NameType && type.isTypeVariable(context))
        return getConcreteTypeVariable(type, definition, evaluation, context);

    // If the type itself is number with a derived unit, concretize it.
    if (type instanceof NumberType && type.hasDerivedUnit())
        return getConcreteNumberInput(type, evaluation, context);

    // If the type is some other type, but contains one of the above, concretize them and construct a new compound type.
    // We do this in a loop since each time we clone the type, the abstract types that have yet to be concretized
    // are cloned too, so we can't just get a list and loop through it.
    do {
        const abstractTypes = type.nodes(
            (n) =>
                (n instanceof NameType && n.isTypeVariable(context)) ||
                (n instanceof NumberType && n.hasDerivedUnit())
        ) as (NameType | NumberType)[];
        const nextAbstractType = abstractTypes[0];
        // If there's another abstract type, resolve it.
        if (nextAbstractType) {
            const concreteType =
                nextAbstractType instanceof NameType
                    ? getConcreteTypeVariable(
                          nextAbstractType,
                          definition,
                          evaluation,
                          context
                      )
                    : getConcreteNumberInput(
                          nextAbstractType,
                          evaluation,
                          context
                      );
            // Clone the current type, replacing the abstract type with the concrete type.
            type = type.replace(nextAbstractType, concreteType);
        }
        // If there isn't another abstract type, we have our type!
        else break;
    } while (true);

    // Return the now concrete type.
    return type;
}

/**
 * Convert the given measurement type into a concrete type if it has a derived unit.
 * @param type The type to concretize
 * @param evaluation The evaluation processing the given input type
 * @param context The context in which we're evaluating.
 */
function getConcreteNumberInput(
    type: NumberType,
    evaluation: EvaluationType,
    context: Context
) {
    // If the type is abstract, concretize it. Otherwise, just return the existing concrete type.
    return type.unit instanceof Function
        ? // Annotate the type with the evaluate so it can resolve its abstract unit.
          type.withUnit(type.withOp(evaluation).concreteUnit(context))
        : type;
}

/**
 * Convert the given reference to a type variable into a concrete type, by resolving a type input on the evaluation or inferring a type from the evaluation's concrete input types.
 */
function getConcreteTypeVariable(
    type: NameType,
    definition: FunctionDefinition | StructureDefinition | StreamDefinition,
    evaluation: EvaluationType,
    context: Context
): Type {
    if (definition instanceof StreamDefinition)
        return new UnknownVariableType(evaluation);

    // What's the type variable we're trying to resolve?
    const typeVariable = type.resolve(context);

    // If we didn't find one, we don't know the type.
    if (!(typeVariable instanceof TypeVariable))
        return new UnknownVariableType(evaluation);

    // First, the easy case: let's see if the evaluate has a type input that defines this type variable.  see if the type for the type variable was provided explicitly in the evaluation.
    // What is the index of the type variable in the definition?
    const typeVarIndex = definition.types?.variables.findIndex(
        (v) => v === typeVariable
    );
    if (typeVarIndex && evaluation instanceof Evaluate) {
        const typeInputs = evaluation.getTypeInputs();
        if (
            typeVarIndex >= 0 &&
            typeInputs &&
            typeVarIndex < typeInputs.types.length
        ) {
            const typeInput = typeInputs.types[typeVarIndex];
            // If it was parsable, we have a type, yay!
            if (typeInput) return typeInput;
        }
    }

    // If we didn't find it explicitly provided as an input, can we infer it from the structure on which this function is being called?
    // For example, suppose we were evaluating ["hi" "mom"].first(), a structure with a generic type variable that defines the list item types.
    // In this case, we can ask the type of the structure to tell us what concrete type it contains.
    // This case handles Evaluate syntax.
    if (
        evaluation instanceof Evaluate &&
        evaluation.fun instanceof PropertyReference
    ) {
        const structureType = evaluation.fun.structure.getType(context);
        const typeInput = structureType.resolveTypeVariable(
            type.getName(),
            context
        );
        if (typeInput !== undefined) return typeInput;
    }

    // This case handles the BinaryOperator syntax.
    if (evaluation instanceof BinaryEvaluate) {
        const structureType = evaluation.left.getType(context);
        const typeInput = structureType.resolveTypeVariable(
            type.getName(),
            context
        );
        if (typeInput !== undefined) return typeInput;
    }

    // If that didn't work, maybe we can infer it from the inputs given on the evaluation.
    // For example, if a function took input ƒ (# # T), and this evaluate is ƒ (1 2 3), then we can infer that T is #.
    // Or, if a function takes a function input ƒ (# # ƒ() T), and this evaluate is ƒ (1 2 ƒ() 1), then we can infer that T is #.
    // See if any of the function or structure's inputs have a type variable type corresponding to the name.
    // Is there an input whose type is the type variable we're trying to resolve?
    if (evaluation instanceof Evaluate) {
        // See if the definitions have one of the two cases above.
        const indexOfInputWithVariableType = definition.inputs.findIndex(
            (i) =>
                i instanceof Bind &&
                i.type instanceof NameType &&
                i.type.isTypeVariable(context) &&
                typeVariable.hasName(i.type.getName())
        );
        const indexOfInputWithVariableOutputType = definition.inputs.findIndex(
            (i) =>
                i instanceof Bind &&
                i.type instanceof FunctionType &&
                i.type.output instanceof NameType &&
                i.type.output.isTypeVariable(context) &&
                typeVariable.hasName(i.type.output.getName())
        );

        let inputFromWhichToInferType = -1;
        let inOutput = false;
        if (indexOfInputWithVariableType >= 0)
            inputFromWhichToInferType = indexOfInputWithVariableType;
        else if (indexOfInputWithVariableOutputType >= 0) {
            inputFromWhichToInferType = indexOfInputWithVariableOutputType;
            inOutput = true;
        }

        // If we found an input on the definition that refers to this type variable, then see if we can find the corresponding input in this evaluation from
        // which we can infer its type.
        if (inputFromWhichToInferType >= 0) {
            const inputWithVariableType =
                evaluation.inputs[inputFromWhichToInferType];
            let concreteType: Type | undefined = undefined;
            if (
                inputWithVariableType instanceof Bind &&
                inputFromWhichToInferType < evaluation.inputs.length
            ) {
                // Is this input specified by name in the evaluation?
                const namedInput = evaluation.inputs.find(
                    (i) =>
                        i instanceof Bind &&
                        inputWithVariableType
                            .getNames()
                            .find((n) => i.hasName(n)) !== undefined
                ) as Bind | undefined;
                if (namedInput !== undefined) {
                    // Infer the type of the type variable from the input's value expression.
                    if (namedInput.value !== undefined)
                        concreteType = namedInput.value.getType(context);
                }
            }
            // If the input is not named, get the input input at the corresponding index.
            else {
                const inputByIndex =
                    evaluation.inputs[inputFromWhichToInferType];
                // Check to see if such an input exists
                if (inputByIndex instanceof Expression)
                    concreteType = inputByIndex.getType(context);
            }
            // Finally, if we're extracting the output type of a function input, and the output isn't a type variable itself, get the output type.
            if (inOutput && concreteType instanceof FunctionType) {
                // This prevents infinite recursion; if we returned this, this algorithm would forever
                // try to infer this type variable.
                if (
                    concreteType.output instanceof NameType &&
                    concreteType.output.isTypeVariable(context)
                )
                    concreteType = new UnknownVariableType(evaluation);
                else concreteType = concreteType.output;
            }

            // If we found a type, return it!
            if (concreteType !== undefined) return concreteType;
        }
    }

    // We failed to find the type! Who knows what this type variable refers to.
    return new UnknownVariableType(evaluation);
}

export function getConcreteConversionTypeVariable(
    type: NameType,
    definition: ConversionDefinition,
    convert: Convert,
    context: Context
): Type {
    // Get the type of the input on the convert.
    const inputType = convert.expression.getType(context);

    // Resolve the type variable.
    const concreteTypeCorrespondingToTypeVariable =
        inputType.resolveTypeVariable(type.getName(), context);

    // Not a type variable? Return the type unchanged.
    return concreteTypeCorrespondingToTypeVariable ?? type;
}
