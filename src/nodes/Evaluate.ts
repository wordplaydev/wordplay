import Bind from "../nodes/Bind";
import type Conflict from "../conflicts/Conflict";
import { RedundantNamedInput } from "../conflicts/RedundantNamedInput";
import { InvalidInputName } from "../conflicts/InvalidInputName";
import { MissingInput } from "../conflicts/MissingInput";
import { UnexpectedInputs } from "../conflicts/UnexpectedInputs";
import { IncompatibleInputs as IncompatibleInput } from "../conflicts/IncompatibleInputs";
import { NotInstantiable } from "../conflicts/NotInstantiable";
import { NotAFunction } from "../conflicts/NotAFunction";
import StructureType from "./StructureType";
import Expression from "./Expression";
import FunctionType, { type Input } from "./FunctionType";
import type Token from "./Token";
import Type from "./Type";
import type TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Evaluation from "../runtime/Evaluation";
import FunctionValue from "../runtime/FunctionValue";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type { ConflictContext } from "./Node";

export default class Evaluate extends Expression {

    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly func: Expression | Unparsable;
    readonly inputs: (Unparsable|Bind|Expression)[];
    readonly close: Token;

    constructor(typeVars: (TypeVariable|Unparsable)[], open: Token, subject: Expression | Unparsable, values: (Unparsable|Bind|Expression)[], close: Token) {
        super();

        this.typeVars = typeVars;
        this.open = open;
        this.func = subject;
        this.inputs = values.slice();
        this.close = close;
    }

    getChildren() {
        return [ ...this.typeVars, this.func, this.open, ...this.inputs, this.close ];
    }

    getConflicts(context: ConflictContext): Conflict[] { 
    
        const conflicts = [];

        if(this.func instanceof Expression) {
            const functionType = this.func.getType(context);

            // The function must be a function or structure.
            if(!(functionType instanceof FunctionType || functionType instanceof StructureType))
                conflicts.push(new NotAFunction(this, functionType));
            else { 
                let targetInputs: Input[] | undefined = undefined;
                if(functionType instanceof FunctionType)
                    targetInputs = functionType.inputs;
                else if(functionType instanceof StructureType) {
                    // Can't create interfaces that don't have missing function definitions.
                    if(functionType.type.isInterface())
                        conflicts.push(new NotInstantiable(this));

                    // Get the types of all of the inputs.
                    targetInputs = functionType.type.getFunctionType(context).inputs;
                }

                // Did we successfully get types for all of the inputs of this function?
                // If so, see if the inputs provided match the types expected.
                if(targetInputs !== undefined) {

                    // To do this, we have to account for three types of input patterns:
                    //  1) Unnamed sequences (e.g., (a b c) => (1 2 3)
                    //  2) Variable length trailing sequences (e.g., (a b …c) => (1 2 3 4 5 6))
                    //  3) Named arguments (e.g., (a b:1 c:2) => (1 c:3))
                    // These can be mixed and matched in the following order
                    //  (required* optional* rest?)
                    // To verify that it's a match, the algorithm needs to check that
                    // all required inputs are provided and a compatible type, 
                    // that optional arguments have valid names and are the compatible type
                    // and that all variable length inputs have compatible types.
                    // To do this, we loop through function/structure's input pattern, and
                    // essentially parse the inputs given in this evaluate, halting on a type error.

                    // Get all of the expressions in this Evaluate
                    const givenInputs = this.inputs.slice();
                    const namesProvided = new Set<string>();
                    // Loop through each of the expected types and see if the given types match
                    for(let i = 0; i < targetInputs.length; i++) {
                        const input = targetInputs[i];
                        if(input.required) {
                            const given = givenInputs.shift();
                            // No more inputs? Mark one missing and stop.
                            if(given === undefined) {
                                conflicts.push(new MissingInput(functionType, this, input));
                                break;
                            }
                            // Otherwise, does the next given input match this required input?
                            else {
                                const givenType = given instanceof Bind ? given.value?.getType(context) : given.getType(context);
                                // If the given input is a named input, 1) the given name should match the required input.
                                // and 2) it shouldn't already be set.
                                if(given instanceof Bind) {
                                    const givenName = given.names[0].getName();
                                    // If we've already given the name...
                                    if(namesProvided.has(givenName)) {
                                        conflicts.push(new RedundantNamedInput(functionType, this, input));
                                        break;
                                    }
                                    // The given name has to match the required name.
                                    else if(input.aliases.find(a => a.getName() === givenName) === undefined) {
                                        conflicts.push(new InvalidInputName(functionType, this, input));
                                        break;
                                    }
                                    // The types have to match
                                    else if(input.type instanceof Type && given.value !== undefined && !given.value.getType(context).isCompatible(context, input.type)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, input));
                                        break;
                                    }
                                    // Remember that we named this input to catch redundancies.
                                    else input.aliases.forEach(a => namesProvided.add(a.getName()));
                                }
                                // If it's not a bind, check the type of the next given input.
                                else {
                                    if(givenType !== undefined && input.type instanceof Type && !givenType.isCompatible(context, input.type)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, input));
                                        break;
                                    }
                                    // Remember that we got this named input.
                                    input.aliases.forEach(a => namesProvided.add(a.getName()));
                                }
                            }
                        }
                        // If it's optional, go through each one to see if it's provided in the remaining inputs.
                        else {
                            // If it's variable length, check all of the remaining given inputs to see if they match this type.
                            if(input.rest) {
                                while(givenInputs.length > 0) {
                                    const given = givenInputs.shift();
                                    if(given !== undefined && given instanceof Expression && input.type instanceof Type && !given.getType(context).isCompatible(context, input.type)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, input));
                                        break;
                                    }
                                }
                            }
                            // If it's just an optional input, see if any of the inputs provide it.
                            else {
                                // Is there a named input that matches?
                                const matchingBind = givenInputs.find(i => i instanceof Bind && input.aliases.find(a => a.getName() === i.getNames()[0]) !== undefined);
                                if(matchingBind instanceof Bind) {
                                    // If the types don't match, there's a conflict.
                                    if(matchingBind.value !== undefined && input.type instanceof Type && !matchingBind.value.getType(context).isCompatible(context, input.type)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, input));
                                        break;
                                    }
                                    // Otherwise, remember that we matched on this and remove it from the given inputs list.
                                    input.aliases.forEach(a => namesProvided.add(a.getName()));
                                    const bindIndex = givenInputs.indexOf(matchingBind);
                                    if(bindIndex >= 0)
                                        givenInputs.splice(bindIndex, 1);
                                }
                                // Otherwise, see if the next input matches the type.
                                else if(givenInputs.length > 0 && input.type instanceof Type && !givenInputs[0].getType(context).isCompatible(context, input.type)) {
                                    conflicts.push(new IncompatibleInput(functionType, this, input));
                                    break;
                                }
                                // Otherwise, remove the given input and remember we matched this input's names.
                                else {
                                    const given = givenInputs.shift();
                                    if(given !== undefined && given instanceof Bind && namesProvided.has(given.getNames()[0])) {
                                        conflicts.push(new RedundantNamedInput(functionType, this, input));
                                        break;
                                    } 
                                    input.aliases.forEach(a => namesProvided.add(a.getName()));
                                }
                            }
                        }
                        // Optional
                        // Rest
                    }

                    // If there are remaining given inputs, something's wrong.
                    if(givenInputs.length > 0) {
                        conflicts.push(new UnexpectedInputs(functionType, this));
                    }

                }
            }
        }

        return conflicts;
    
    }

    getType(context: ConflictContext): Type {
        if(this.func instanceof Unparsable) return new UnknownType(this);
        const funcType = this.func.getType(context);
        if(funcType instanceof FunctionType && funcType.output instanceof Type) return funcType.output;
        if(funcType instanceof StructureType) return funcType;
        else return new UnknownType(this);
    }

    compile(context: ConflictContext):Step[] {

        // To compile an evaluate, we need to compile all of the given and default values in
        // order of the function's declaration. This requires getting the function/structure definition
        // and finding an expression to compile for each input.


        // Evaluate the function expression, then the inputs, then evaluate this this.
        return [ 
            new Start(this),
            ...this.func.compile(context), 
            ...this.inputs.reduce((steps: Step[], input) => [ ...steps, ...input.compile(context)], []), 
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Get all the values off the stack.
        const values = [];
        for(let i = 0; i < this.inputs.length; i++) {
            const value = evaluator.popValue();
            if(value instanceof Unparsable) return new Exception(this, ExceptionKind.UNPARSABLE);
            else if(value instanceof Exception) return value;
            else values.unshift(value);
        }

        // Get the function off the stack and bail if it's not a function.
        const functionOrStructure = evaluator.popValue();
        if(functionOrStructure instanceof FunctionValue) {

            // Bail if the function's body isn't an expression.
            if(!(functionOrStructure.definition.expression instanceof Expression))
                return new Exception(this, ExceptionKind.PLACEHOLDER);

            // Build the bindings.
            const bindings = this.buildBindings(functionOrStructure.definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            // Now that all of the inputs are resolved, create an execution context that binds all of the inputs.
            evaluator.startEvaluation(new Evaluation(evaluator, functionOrStructure.definition, functionOrStructure.definition.expression, functionOrStructure.context, bindings));

        }
        else if(functionOrStructure instanceof StructureDefinitionValue) {

            // Build the custom type's bindings.
            const bindings = this.buildBindings(functionOrStructure.definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            // Evaluate the type's block with the bindings, generating an evaluation context with the
            // type's inputs and functions.
            evaluator.startEvaluation(new Evaluation(evaluator, functionOrStructure.definition, functionOrStructure.definition.block, evaluator.getEvaluationContext(), bindings));

        }
        // We don't know how to evaluate anything else...
        else return new Exception(this, ExceptionKind.EXPECTED_TYPE);

    }

    buildBindings(inputs: (Bind | Unparsable)[], values: Value[], ): Map<string, Value> | Exception {

        // Build the bindings, backwards because they are in reverse on the stack.
        const bindings = new Map<string, Value>();
        for(let i = 0; i < inputs.length; i++) {
            const bind = inputs[i];
            if(bind instanceof Unparsable) return new Exception(this, ExceptionKind.UNPARSABLE);
            else if(i >= values.length) return new Exception(this, ExceptionKind.EXPECTED_VALUE);
            bind.names.forEach(name => bindings.set(name.getName(), values[i]));
        }
        return bindings;

    }
    
}