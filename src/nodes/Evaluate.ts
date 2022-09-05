import Bind from "../nodes/Bind";
import type Conflict from "../conflicts/Conflict";
import { RedundantNamedInput } from "../conflicts/RedundantNamedInput";
import { InvalidInputName } from "../conflicts/InvalidInputName";
import { MissingInput } from "../conflicts/MissingInput";
import { UnexpectedInputs } from "../conflicts/UnexpectedInputs";
import { IncompatibleInput } from "../conflicts/IncompatibleInput";
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
import Action from "../runtime/Start";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type { ConflictContext } from "./Node";
import Halt from "../runtime/Halt";
import List from "../runtime/List";

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
            const functionType = this.func.getTypeUnlessCycle(context);

            // The function must be a function or structure.
            if(!(functionType instanceof FunctionType || functionType instanceof StructureType))
                conflicts.push(new NotAFunction(this, functionType));
            else { 
                let targetInputs: Input[] | undefined = undefined;
                if(functionType instanceof FunctionType)
                    targetInputs = functionType.inputs;
                else if(functionType instanceof StructureType) {
                    // Can't create interfaces that don't have missing function definitions.
                    if(functionType.definition.isInterface())
                        conflicts.push(new NotInstantiable(this));

                    // Get the types of all of the inputs.
                    targetInputs = functionType.definition.getFunctionType(context).inputs;
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
                                const givenType = given instanceof Bind ? given.value?.getTypeUnlessCycle(context) : given.getTypeUnlessCycle(context);
                                // If the given input is a named input, 1) the given name should match the required input.
                                // and 2) it shouldn't already be set.
                                if(given instanceof Bind) {
                                    const givenName = given.names[0].getName();
                                    if(givenName !== undefined) {
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
                                        else if(input.type instanceof Type && given.value !== undefined && !given.value.getTypeUnlessCycle(context).isCompatible(context, input.type)) {
                                            conflicts.push(new IncompatibleInput(functionType, this, input));
                                            break;
                                        }
                                        // Remember that we named this input to catch redundancies.
                                        else input.aliases.forEach(a => {
                                            const name = a.getName();
                                            if(name !== undefined)
                                                namesProvided.add(name)
                                        });
                                    }
                                }
                                // If it's not a bind, check the type of the next given input.
                                else {
                                    if(givenType !== undefined && input.type instanceof Type && !givenType.isCompatible(context, input.type)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, input));
                                        break;
                                    }
                                    // Remember that we got this named input.
                                    input.aliases.forEach(a => {
                                        const name = a.getName();
                                        if(name !== undefined)
                                            namesProvided.add(name);
                                    });
                                }
                            }
                        }
                        // If it's optional, go through each one to see if it's provided in the remaining inputs.
                        else {
                            // If it's variable length, check all of the remaining given inputs to see if they match this type.
                            if(input.rest !== false) {
                                while(givenInputs.length > 0) {
                                    const given = givenInputs.shift();
                                    if(given !== undefined && given instanceof Expression && input.type instanceof Type && !given.getTypeUnlessCycle(context).isCompatible(context, input.type)) {
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
                                    if(matchingBind.value !== undefined && input.type instanceof Type && !matchingBind.value.getTypeUnlessCycle(context).isCompatible(context, input.type)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, input));
                                        break;
                                    }
                                    // Otherwise, remember that we matched on this and remove it from the given inputs list.
                                    input.aliases.forEach(a => {
                                        const name = a.getName();
                                        if(name !== undefined)
                                            namesProvided.add(name);
                                    });
                                    const bindIndex = givenInputs.indexOf(matchingBind);
                                    if(bindIndex >= 0)
                                        givenInputs.splice(bindIndex, 1);
                                }
                                // Otherwise, see if the next input matches the type.
                                else if(givenInputs.length > 0 && input.type instanceof Type && !givenInputs[0].getTypeUnlessCycle(context).isCompatible(context, input.type)) {
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
                                    input.aliases.forEach(a => {
                                        const name = a.getName();
                                        if(name !== undefined)
                                            namesProvided.add(name)
                                    });
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
        const funcType = this.func.getTypeUnlessCycle(context);
        if(funcType instanceof FunctionType && funcType.output instanceof Type) return funcType.output;
        if(funcType instanceof StructureType) return funcType;
        else return new UnknownType(this);
    }

    compile(context: ConflictContext): Step[] {

        // To compile an evaluate, we need to compile all of the given and default values in
        // order of the function's declaration. This requires getting the function/structure definition
        // and finding an expression to compile for each input.
        const funcType = this.func.getTypeUnlessCycle(context);
        const inputs = funcType instanceof FunctionType ? funcType.inputs :
            funcType instanceof StructureType ? funcType.definition.getFunctionType(context).inputs :
            undefined;

        // Compile a halt if we couldn't find the function.
        if(inputs === undefined)
            return [ new Halt(new Exception(this, ExceptionKind.EXPECTED_FUNCTION), this) ];

        // Iterate through the inputs, compiling appropriate expressions.
        // Make a copy of this evaluate's inputs and process them as we go.
        const given = this.inputs.slice();
        const inputSteps = inputs.map(input => {
            
            // Find the given input that corresponds to the next desired input.
            // If this input is required, grab the next given input.
            if(input.required) {
                const requiredInput = given.shift();
                if(requiredInput === undefined)
                    return [ new Halt(new Exception(this, ExceptionKind.EXPECTED_EXPRESSION), this) ];
                else
                    return requiredInput.compile(context);
            }
            // If it's not required...
            else {
                // and it's not a variable length input, first search for a named input, otherwise grab the next input.
                if(input.rest === false) {
                    const bind = given.find(g => g instanceof Bind && input.aliases.find(a => a.getName() === g.names[0].getName()) !== undefined);
                    // If we found a bind with a matching name, compile it's value.
                    if(bind instanceof Bind && bind.value !== undefined)
                        return bind.value.compile(context);
                    // If we didn't, then compile the next value.
                    const optionalInput = given.shift();
                    if(optionalInput !== undefined)
                        return optionalInput.compile(context);
                    // If there wasn't one, use the default value.
                    return input.default === undefined ? 
                        [ new Halt(new Exception(this, ExceptionKind.EXPECTED_EXPRESSION), this) ] :
                        input.default.compile(context);
                }
                // If it is a variable length input, reduce the remaining given input expressions.
                else {
                    return given.reduce((prev: Step[], next) =>
                        [
                            ...prev, 
                            ...(
                                next instanceof Unparsable ? [ new Halt(new Exception(this, ExceptionKind.UNPARSABLE), this) ] :
                                next instanceof Bind ? 
                                    (
                                        next.value === undefined ? 
                                            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_EXPRESSION), this) ] : 
                                            next.value.compile(context)
                                    ) :
                                next.compile(context)
                            )                        
                        ],
                        []
                    );
                }
            }
        });
    
        // Evaluate the function expression, then the inputs, then evaluate this using the resulting values.
        return [ 
            new Action(this),
            ...inputSteps.reduce((steps: Step[], s) => [ ...steps, ...s], []), 
            ...this.func.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Get the function off the stack and bail if it's not a function.
        const functionOrStructure = evaluator.popValue();

        // Pop as many values as the definition requires, or the number of inputs provided, whichever is larger.
        // This accounts for variable length arguments.
        const count = Math.max(
            functionOrStructure instanceof FunctionValue ? functionOrStructure.definition.inputs.length :
            functionOrStructure instanceof StructureDefinitionValue ? functionOrStructure.definition.inputs.length :
            0,
            this.inputs.length
        )

        // Get all the values off the stack, getting as many as is defined.
        const values = [];
        for(let i = 0; i < count; i++) {
            const value = evaluator.popValue();
            if(value instanceof Exception) return value;
            else values.unshift(value);
        }
        
        if(functionOrStructure instanceof FunctionValue) {

            const definition = functionOrStructure.definition;
            const body = functionOrStructure.definition.expression;

            // Bail if the function's body isn't an expression.
            if(!(body instanceof Expression))
                return new Exception(this, ExceptionKind.PLACEHOLDER);

            // Build the bindings.
            const bindings = this.buildBindings(definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            evaluator.startEvaluation(new Evaluation(
                evaluator, 
                definition, 
                body, 
                functionOrStructure.context, 
                bindings)
            );

        }
        else if(functionOrStructure instanceof StructureDefinitionValue) {

            // Build the custom type's bindings.
            const bindings = this.buildBindings(functionOrStructure.definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            // Evaluate the structure's block with the bindings, generating an evaluation context with the
            // type's inputs and functions.
            evaluator.startEvaluation(new Evaluation(evaluator, functionOrStructure.definition, functionOrStructure.definition.block, evaluator.getEvaluationContext(), bindings));

        }
        else return new Exception(this, ExceptionKind.EXPECTED_TYPE);

    }

    buildBindings(inputs: (Bind | Unparsable)[], values: Value[], ): Map<string, Value> | Exception {

        // Build the bindings, backwards because they are in reverse on the stack.
        const bindings = new Map<string, Value>();
        for(let i = 0; i < inputs.length; i++) {
            const bind = inputs[i];
            if(bind instanceof Unparsable) return new Exception(this, ExceptionKind.UNPARSABLE);
            else if(i >= values.length) 
                return new Exception(this, ExceptionKind.EXPECTED_VALUE);
            bind.names.forEach(name => {
                const n = name.getName();
                if(n !== undefined)
                    bindings.set(
                        n, 
                        bind.isVariableLength() ? 
                            new List(values.slice(i)) :
                            values[i]
                    )
            });
        }
        return bindings;

    }
    
}