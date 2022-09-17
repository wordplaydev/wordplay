import Bind from "../nodes/Bind";
import type Conflict from "../conflicts/Conflict";
import { RedundantNamedInput } from "../conflicts/RedundantNamedInput";
import { UnknownInputName } from "../conflicts/UnknownInputName";
import { MissingInput } from "../conflicts/MissingInput";
import { UnexpectedInputs } from "../conflicts/UnexpectedInputs";
import { IncompatibleInput } from "../conflicts/IncompatibleInput";
import { NotInstantiable } from "../conflicts/NotInstantiable";
import { NotAFunction } from "../conflicts/NotAFunction";
import StructureType from "./StructureType";
import Expression from "./Expression";
import FunctionType from "./FunctionType";
import Token from "./Token";
import type Node from "./Node";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
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
import type Context from "./Context";
import Halt from "../runtime/Halt";
import List from "../runtime/List";
import NameType from "./NameType";
import StructureDefinition from "./StructureDefinition";
import FunctionDefinition from "./FunctionDefinition";
import AccessName from "./AccessName";
import TypeInput from "./TypeInput";

export default class Evaluate extends Expression {

    readonly typeInputs: TypeInput[];
    readonly open: Token;
    readonly func: Expression | Unparsable;
    readonly inputs: (Unparsable|Bind|Expression)[];
    readonly close: Token;

    constructor(typeInputs: TypeInput[], open: Token, func: Expression | Unparsable, inputs: (Unparsable|Bind|Expression)[], close: Token) {
        super();

        this.typeInputs = typeInputs;
        this.open = open;
        this.func = func;
        this.inputs = inputs.slice();
        this.close = close;
    }

    computeChildren() {
        let children: Node[] = [];
        children = children.concat([ ...this.typeInputs, this.func, this.open, ...this.inputs, this.close ]);
        return children;
    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        if(this.func instanceof Expression) {
            const functionType = this.func.getTypeUnlessCycle(context);

            // The function must be a function or structure. If it's not, that's a conflict.
            if(!(functionType instanceof FunctionType || functionType instanceof StructureType))
                conflicts.push(new NotAFunction(this, functionType));
            // Otherwise, let's verify that all of the inputs provided are valid.
            else {
                let targetInputs: (Bind|Unparsable)[] | undefined = undefined;
                if(functionType instanceof FunctionType)
                    targetInputs = functionType.inputs;
                else if(functionType instanceof StructureType) {
                    // Can't create interfaces that don't have missing function definitions.
                    const abstractFunctions = functionType.definition.getAbstractFunctions();
                    if(abstractFunctions !== undefined && abstractFunctions.length > 0)
                        conflicts.push(new NotInstantiable(this, functionType.definition, abstractFunctions));

                    // Get the types of all of the inputs.
                    targetInputs = functionType.definition.inputs;
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
                        const concreteInputType = input instanceof Bind && input.type instanceof Type ? this.resolveTypeNames(input.type, context) : undefined;

                        if(input instanceof Bind && !input.hasDefault()) {
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
                                            conflicts.push(new RedundantNamedInput(functionType, given, this, input));
                                            break;
                                        }
                                        // The given name has to match the required name.
                                        else if(!input.hasName(givenName)) {
                                            conflicts.push(new UnknownInputName(functionType, this, input, given));
                                            break;
                                        }
                                        // The types have to match
                                        else if(concreteInputType !== undefined && given.value !== undefined && !given.value.getTypeUnlessCycle(context).isCompatible(concreteInputType, context) && !(given.value instanceof Unparsable)) {
                                            conflicts.push(new IncompatibleInput(functionType, this, given.value, given.value.getTypeUnlessCycle(context), concreteInputType));
                                        }
                                        // Remember that we named this input to catch redundancies.
                                        else input.getNames().forEach(name => namesProvided.add(name));
                                    }
                                }
                                // If it's not a bind, check the type of the next given input.
                                else {
                                    if(!(given instanceof Unparsable) && givenType !== undefined && concreteInputType !== undefined && !givenType.isCompatible(concreteInputType, context)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, given, givenType, concreteInputType));
                                    }
                                    // Remember that we got this named input.
                                    input.getNames().forEach(name => namesProvided.add(name));
                                }
                            }
                        }
                        // If it's optional, go through each one to see if it's provided in the remaining inputs.
                        else if(input instanceof Bind) {
                            // If it's variable length, check all of the remaining given inputs to see if they match this type.
                            if(input.isVariableLength()) {
                                while(givenInputs.length > 0) {
                                    const given = givenInputs.shift();
                                    if(given !== undefined && given instanceof Expression && concreteInputType !== undefined && !given.getTypeUnlessCycle(context).isCompatible(concreteInputType, context)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, given, given.getTypeUnlessCycle(context), concreteInputType));
                                        break;
                                    }
                                }
                            }
                            // If it's just an optional input, see if any of the inputs provide it.
                            else {
                                // Is there a named input that matches?
                                const matchingBind = givenInputs.find(i => i instanceof Bind && input.names.find(a => a.getName() === i.getNames()[0]) !== undefined);
                                if(matchingBind instanceof Bind) {
                                    // If the types don't match, there's a conflict.
                                    if(matchingBind.value !== undefined && !(matchingBind.value instanceof Unparsable) && concreteInputType !== undefined && !matchingBind.value.getTypeUnlessCycle(context).isCompatible(concreteInputType, context)) {
                                        conflicts.push(new IncompatibleInput(functionType, this, matchingBind.value, matchingBind.value.getTypeUnlessCycle(context), concreteInputType));
                                        break;
                                    }
                                    // Otherwise, remember that we matched on this and remove it from the given inputs list.
                                    input.getNames().forEach(name => namesProvided.add(name));
                                    const bindIndex = givenInputs.indexOf(matchingBind);
                                    if(bindIndex >= 0)
                                        givenInputs.splice(bindIndex, 1);
                                }
                                // Otherwise, see if the next input matches the type.
                                else if(givenInputs.length > 0 && concreteInputType !== undefined && (givenInputs[0] instanceof Expression) && !givenInputs[0].getTypeUnlessCycle(context).isCompatible(concreteInputType, context)) {
                                    conflicts.push(new IncompatibleInput(functionType, this, givenInputs[0] as Expression, givenInputs[0].getTypeUnlessCycle(context), concreteInputType));
                                    break;
                                }
                                // Otherwise, remove the given input and remember we matched this input's names.
                                else {
                                    const given = givenInputs.shift();
                                    if(given !== undefined && given instanceof Bind && namesProvided.has(given.getNames()[0])) {
                                        conflicts.push(new RedundantNamedInput(functionType, given, this, input));
                                        break;
                                    } 
                                    input.getNames().forEach(name => namesProvided.add(name));
                                }
                            }
                        }
                        // Optional
                        // Rest
                    }

                    // If there are remaining given inputs, something's wrong.
                    if(givenInputs.length > 0) {
                        conflicts.push(new UnexpectedInputs(functionType, this, givenInputs));
                    }

                }
            }
        }

        return conflicts;
    
    }

    computeType(context: Context): Type {
        
        const funcType = this.func.getTypeUnlessCycle(context);

        // If it's a function type with an output type, then return the output type.
        if(funcType instanceof FunctionType && funcType.output instanceof Type) return this.resolveTypeNames(funcType.output, context);
        // If it's a structure, then this is an instantiation of the structure, so this evaluate resolves
        // to a value of the structure's type.
        else if(funcType instanceof StructureType) return funcType;
        // Otherwise, who knows.
        else return new UnknownType(this);

    }

    resolveTypeNames(type: Type, context: Context) {

        // Resolve name type if it isn't a type variable.
        if(type instanceof NameType && !type.isTypeVariable(context))
            return type.getType(context);

        // Find any type variables or name types that refer to type variables in the given type.
        // We do this in a loop because each time we revise the type, we clone everything in the
        // type, and so the initial name types we're trying to resolve no longer exist.
        let typeVariables = type.nodes(n => n instanceof NameType && n.isTypeVariable(context)) as NameType[];
        let count = typeVariables.length;
        let originalParents = typeVariables.map(n => n._parent);
        let index = 0;
        while(index < count) {
        
            const variableTypes = type.nodes(n => n instanceof NameType && n.isTypeVariable(context)) as NameType[];
            if(variableTypes.length === 0) break;
            const nameType = variableTypes[0];

            // This will store whatever concrete type we find for the type variable.
            let concreteType: Type | undefined = undefined;
            // Find the definition of the type variable.
            const typeVarDeclaration = nameType.getDefinition(context);
            if(typeVarDeclaration instanceof TypeVariable) {
                const def = typeVarDeclaration.getParent();
                // If the type variable is declared in a structure or function definition (the only places where they are declared,
                // then infer the type of the type variable from the structure on which this function is being called.
                if(def instanceof StructureDefinition || def instanceof FunctionDefinition) {
                    // Determine the index of the type variable.
                    // If we found it (which we always should), is it provided as an type input on this Evaluate?
                    const typeVarIndex = def.typeVars.findIndex(v => v === typeVarDeclaration);
                    if(typeVarIndex >= 0 && typeVarIndex < this.typeInputs.length) {
                        const typeInput = this.typeInputs[typeVarIndex];
                        if(typeInput.type instanceof Type)
                            concreteType = typeInput.type;
                    }
                    
                    // Can we infer it from the structure on which this function is being called?
                    if(concreteType === undefined && this.func instanceof AccessName) {
                        const subjectType = this.func.subject.getType(context);
                        concreteType = subjectType.resolveTypeVariable(nameType.getName());
                    }
                    
                    // Can we infer it from any of the inputs?
                    // See if any of the function or structure's inputs have a type variable type corresponding to the name.
                    if(concreteType === undefined) {
                        const indexOfInputWithVariableType = def.inputs.findIndex(i => i instanceof Bind && i.type instanceof NameType && i.type.isTypeVariable(context) && i.type.getName() === typeVarDeclaration.name.getText());
                        // If we found an input that has this type, then see if we can find the corresponding input in this evaluate.
                        if(indexOfInputWithVariableType >= 0) {
                            const inputWithVariableType = def.inputs[indexOfInputWithVariableType];
                            if(inputWithVariableType instanceof Bind && indexOfInputWithVariableType < this.inputs.length) {
                                // Is this input specified by name?
                                const namedInput = this.inputs.find(i => i instanceof Bind && inputWithVariableType.getNames().find(n => i.hasName(n)) !== undefined) as Bind | undefined;
                                if(namedInput !== undefined) {
                                    if(namedInput.value !== undefined)
                                        concreteType = namedInput.value.getType(context);
                                }
                                // If it's not, get the input input at the corresponding index.
                                else {
                                    const inputByIndex = this.inputs[indexOfInputWithVariableType];
                                    if(inputByIndex instanceof Expression)
                                        concreteType = inputByIndex.getType(context);
                                }
                            }
                        }
                    }
                }
            }
            // If we found a concrete type, refine the given type with the concrete type, then move on to the next type variable to resolve.
            // Note: we have to do a somewhat kludgey thing here of caching the new type's parents and then 
            // manually assigning the parent.
            if(concreteType !== undefined) {
                type = type.cloneOrReplace([ Type ], nameType, concreteType);
                type.cacheParents();
                type._parent = originalParents[index];
            }

            index++;

        }

        // Return the concretized type.
        return type;
        
    }

    compile(context: Context): Step[] {

        // To compile an evaluate, we need to compile all of the given and default values in
        // order of the function's declaration. This requires getting the function/structure definition
        // and finding an expression to compile for each input.
        const funcType = this.func.getTypeUnlessCycle(context);
        const inputs = funcType instanceof FunctionType ? funcType.inputs :
            funcType instanceof StructureType ? funcType.definition.inputs :
            undefined;

        // Compile a halt if we couldn't find the function.
        if(inputs === undefined)
            return [ new Halt(new Exception(this, ExceptionKind.EXPECTED_FUNCTION), this) ];

        // Iterate through the inputs, compiling appropriate expressions.
        // Make a copy of this evaluate's inputs and process them as we go.
        const given = this.inputs.slice();
        const inputSteps = inputs.map(input => {
            
            if(input instanceof Unparsable) return [];

            // Find the given input that corresponds to the next desired input.
            // If this input is required, grab the next given input.
            if(!input.hasDefault()) {
                const requiredInput = given.shift();
                if(requiredInput === undefined)
                    return [ new Halt(new Exception(this, ExceptionKind.EXPECTED_EXPRESSION), this) ];
                else
                    return requiredInput.compile(context);
            }
            // If it's not required...
            else {
                // and it's not a variable length input, first search for a named input, otherwise grab the next input.
                if(!input.isVariableLength()) {
                    const bind = given.find(g => g instanceof Bind && input.names.find(a => a.getName() === g.names[0].getName()) !== undefined);
                    // If we found a bind with a matching name, compile it's value.
                    if(bind instanceof Bind && bind.value !== undefined)
                        return bind.value.compile(context);
                    // If we didn't, then compile the next value.
                    const optionalInput = given.shift();
                    if(optionalInput !== undefined)
                        return optionalInput.compile(context);
                    // If there wasn't one, use the default value.
                    return input.value === undefined ? 
                        [ new Halt(new Exception(this, ExceptionKind.EXPECTED_EXPRESSION), this) ] :
                        input.value.compile(context);
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
 
    clone(original?: Node, replacement?: Node) { 
        return new Evaluate(
            this.typeInputs.map(t => t.cloneOrReplace([ TypeInput ], original, replacement)), 
            this.open.cloneOrReplace([ Token ], original, replacement), 
            this.func.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.inputs.map(i => i.cloneOrReplace([ Expression, Unparsable, Bind ], original, replacement)), 
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this; 
    }

}