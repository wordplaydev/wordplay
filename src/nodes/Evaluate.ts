import Bind from "../nodes/Bind";
import type Conflict from "../conflicts/Conflict";
import UnexpectedInput from "../conflicts/UnexpectedInput";
import MissingInput from "../conflicts/MissingInput";
import UnexpectedInputs from "../conflicts/UnexpectedInputs";
import IncompatibleInput from "../conflicts/IncompatibleInput";
import NotInstantiable from "../conflicts/NotInstantiable";
import NotAFunction from "../conflicts/NotAFunction";
import StructureType from "./StructureType";
import Expression from "./Expression";
import Token from "./Token";
import type Node from "./Node";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Evaluation from "../runtime/Evaluation";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type Context from "./Context";
import Halt from "../runtime/Halt";
import List from "../runtime/List";
import StructureDefinition from "./StructureDefinition";
import FunctionDefinition from "./FunctionDefinition";
import PropertyReference from "./PropertyReference";
import TypeInput from "./TypeInput";
import { getEvaluationInputConflicts } from "./util";
import ListType from "./ListType";
import type { TypeSet } from "./UnionType";
import SemanticException from "../runtime/SemanticException";
import FunctionException from "../runtime/FunctionException";
import ValueException from "../runtime/ValueException";
import Exception from "../runtime/Exception";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import { getPossibleTypeInsertions, getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import Reference from "./Reference";
import { getExpressionInsertions, getExpressionReplacements, getPossiblePostfix } from "../transforms/getPossibleExpressions";
import type Transform from "../transforms/Transform"
import Block from "./Block";
import Replace from "../transforms/Replace";
import EvalOpenToken from "./EvalOpenToken";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import Remove from "../transforms/Remove";
import UnknownInput from "../conflicts/UnknownInput";
import getConcreteExpectedType from "./Generics";
import FunctionDefinitionType from "./FunctionDefinitionType";
import { withSpaces } from "./spacing";

type InputType = Unparsable | Bind | Expression;

export default class Evaluate extends Expression {

    readonly func: Expression;
    readonly typeInputs: TypeInput[];
    readonly open: Token;
    readonly inputs: InputType[];
    readonly close?: Token;

    constructor(func: Expression, inputs: InputType[], typeInputs?: TypeInput[], open?: Token, close?: Token) {
        super();

        this.typeInputs = typeInputs ?? [];
        this.open = open ?? new EvalOpenToken();
        this.func = func;
        // Inputs must have space between them if they have adjacent names.
        this.inputs = withSpaces(inputs);
        this.close = close;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "func", types:[ Expression ] },
            { name: "typeInputs", types:[[ TypeInput ]] },
            { name: "open", types:[ Token ] },
            { name: "inputs", types:[[ Bind, Expression ]] },
            { name: "close", types:[ Token, undefined ] },
        ];
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new Evaluate(
            this.replaceChild(pretty, "func", this.func, original, replacement), 
            this.replaceChild<InputType[]>(pretty, "inputs", this.inputs, original, replacement),
            this.replaceChild(pretty, "typeInputs", this.typeInputs, original, replacement), 
            this.replaceChild(pretty, "open", this.open, original, replacement), 
            this.replaceChild(pretty, "close", this.close, original, replacement)
        ) as this;
    }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return (this.inputs.includes(child as InputType)) && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth)}` : "";
    }

    isBlockFor(child: Node) { return this.inputs.includes(child as InputType); }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        // Get the function this evaluate is trying to... evaluate.
        const fun = this.getFunction(context);

        // The function must be a function or structure. If it's not, that's a conflict.
        // Then stop checking because we can't analyze anything.
        if(!(fun instanceof FunctionDefinition || fun instanceof StructureDefinition))
            return [ new NotAFunction(this, this.func) ];

        // If it's a structure definition, can we create it?
        if(fun instanceof StructureDefinition) {
            // Can't create interfaces that don't have missing function definitions.
            const abstractFunctions = fun.getAbstractFunctions();
            if(abstractFunctions.length > 0)
                return [ new NotInstantiable(this, fun, abstractFunctions) ];
        }

        // Verify that all of the inputs provided are valid.
        const candidateInputs = fun.inputs;

        // If any of the expected inputs is unparsable, return nothing.
        if(!candidateInputs.every(i => i instanceof Bind)) return [];

        // We made it! Let's analyze the given and expected inputs and see if there are any problems.
        const expectedInputs = candidateInputs as Bind[];

        // If the target inputs has conflicts with its names, defaults, or variable length inputs,
        // then we don't analyze this.
        if(getEvaluationInputConflicts(expectedInputs).length > 0) return [];

        // To verify that this evaluation's given inputs match the target inputs, 
        // the algorithm needs to check that all required inputs are provided and a compatible type, 
        // that optional arguments have valid names and are the compatible type
        // and that all variable length inputs have compatible types.
        // To do this, we loop through target inputs and consume the given inputs according to matching rules.
        const givenInputs = this.inputs.slice() as (Expression | Bind)[];

        // Loop through each of the expected types and see if the given types match.
        for(const expectedInput of expectedInputs) {

            // Figure out what type this expected input is. Resolve any type variables to concrete values.
            const expectedType = getConcreteExpectedType(fun, expectedInput, this, context);

            if(expectedInput.isRequired()) {
                const given = givenInputs.shift();

                // No more inputs? Mark one missing and stop.
                if(given === undefined) return [ new MissingInput(fun, this, this.close ?? this.inputs[this.inputs.length - 1] ?? this.open, expectedInput) ];
                
                // If the given input is a named input, 
                // 1) the given name should match the required input.
                // 2) it shouldn't already be set.
                if(given instanceof Bind) {
                    // If we've already given the name...
                    // The given name has to match the required name.
                    if(!expectedInput.sharesName(given))
                        return [ new UnexpectedInput(fun, this, expectedInput, given) ];
                    // The types have to match
                    if(expectedType !== undefined && given.value instanceof Expression) {
                        const givenType = given.value.getTypeUnlessCycle(context);
                        if(!expectedType.accepts(givenType, context, given.value))
                            conflicts.push(new IncompatibleInput(fun, this, given.value, givenType, expectedType));
                    }
                }
                // If the given value input isn't a bind, check the type of the input.
                else {
                    const givenType = given.getType(context);
                    if(expectedType !== undefined && !expectedType.accepts(givenType, context, given))
                        conflicts.push(new IncompatibleInput(fun, this, given, givenType, expectedType));
                }

            }
            // If it's optional, go through each one to see if it's provided in the remaining inputs.
            else {
                // If it's variable length, check all of the remaining given inputs to see if they match this type.
                if(expectedInput.isVariableLength()) {
                    while(givenInputs.length > 0) {
                        const given = givenInputs.shift();
                        if(given !== undefined && given instanceof Expression) {
                            const givenType = given.getTypeUnlessCycle(context);
                            if(!(expectedType instanceof ListType))
                                throw Error(`Expected list type on variable length input, but received ${expectedType.constructor.name}`);
                            else if(expectedType.type instanceof Type && !expectedType.type.accepts(givenType, context, given))
                                conflicts.push(new IncompatibleInput(fun, this, given, givenType, expectedType.type));
                        }
                    }
                }
                // If it's just an optional input, see if any of the given inputs provide it by name.
                else {
                    // Is there a named input that matches?
                    const matchingBind = givenInputs.find(i => i instanceof Bind && i.sharesName(expectedInput));
                    if(matchingBind instanceof Bind) {
                        // If the types don't match, there's a conflict.
                        if(matchingBind.value !== undefined && matchingBind.value instanceof Expression) {
                            const givenType = matchingBind.value.getTypeUnlessCycle(context);
                            if(!expectedType.accepts(givenType, context, matchingBind.value))
                                conflicts.push(new IncompatibleInput(fun, this, matchingBind.value, givenType, expectedType));
                        }
                        // Remove it from the given inputs list.
                        givenInputs.splice(givenInputs.indexOf(matchingBind), 1);

                    }
                    // If there wasn't a named input matching, see if the next non-bind expression matches the type.
                    else if(givenInputs.length > 0) {
                        const given = givenInputs[0];
                        // If the given input is an expression, map it to the expected input, and see if there's a type error.
                        if(given instanceof Expression) {
                            const givenType = given.getTypeUnlessCycle(context);
                            if(!expectedType.accepts(givenType, context, given))
                                conflicts.push(new IncompatibleInput(fun, this, given, givenType, expectedType));
                            givenInputs.shift();
                        }
                    }
                    // Otherwise, there's no given input for this optional input.
                }

            }

        }

        // See if any of the remaining given inputs are bound to unknown names.
        for(const given of givenInputs) {
            if(given instanceof Bind && expectedInputs.find(expected => expected.sharesName(given)) === undefined) {
                conflicts.push(new UnknownInput(fun, this, given));
                givenInputs.splice(givenInputs.indexOf(given), 1);
            }
        }
        
        // If there are remaining given inputs that didn't match anything, something's wrong.
        if(givenInputs.length > 0)
            conflicts.push(new UnexpectedInputs(fun, this, givenInputs));    
    
        return conflicts;
    
    }

    getFunction(context: Context) {

        let def = 
            this.func instanceof Reference ? this.func.getDefinition(context) :
            this.func instanceof PropertyReference ? this.func.getDefinition(context) :
                undefined;

        if(def instanceof FunctionDefinition || def instanceof StructureDefinition)
            return def;
        if(def instanceof Bind && (def.value instanceof FunctionDefinition || def.value instanceof StructureDefinition))
            return def.value;

        return undefined;

    }

    computeType(context: Context): Type {
        
        const fun = this.getFunction(context);

        // If it's a function type with an output type, then return the output type.
        if(fun instanceof FunctionDefinition) return getConcreteExpectedType(fun, undefined, this, context);
        // If it's a structure, then this is an instantiation of the structure, so this evaluate resolves
        // to a value of the structure's type.
        else if(fun instanceof StructureDefinition) return new StructureType(fun);
        // Otherwise, who knows.
        else return new UnknownType({ definition: this, name: this.func });

    }

    compile(context: Context): Step[] {

        // To compile an evaluate, we need to compile all of the given and default values in
        // order of the function's declaration. This requires getting the function/structure definition
        // and finding an expression to compile for each input.
        const funcType = this.func.getTypeUnlessCycle(context);
        const candidateExpectedInputs = funcType instanceof FunctionDefinitionType ? funcType.fun.inputs :
            funcType instanceof StructureType ? funcType.structure.inputs :
            undefined;

        // Halt if we couldn't find the function.
        if(candidateExpectedInputs === undefined)
            return [ new Halt(evaluator => new FunctionException(evaluator, this, undefined, this.func.toWordplay()), this) ];

        // Halt if any of the function's binds are unparsable.
        const unparsableExpected = candidateExpectedInputs.find(i => i instanceof Unparsable);
        if(unparsableExpected !== undefined)
            return [ new Halt(evaluator => new SemanticException(evaluator, unparsableExpected), this) ];

        // Halt if any of the function's inputs are unparsable.
        const unparsableGiven = this.inputs.find(i => i instanceof Unparsable);
        if(unparsableGiven !== undefined)
            return [ new Halt(evaluator => new SemanticException(evaluator, unparsableGiven), this) ];

        // Make typescript happy now that we've guarded against unparsables.
        const expectedInputs = candidateExpectedInputs as Bind[];
        const givenInputs = this.inputs.slice() as (Expression|Bind)[];

        // Iterate through the inputs, compiling given or default expressions.
        const inputSteps = expectedInputs.map(expectedInput => {

            // Find the given input that corresponds to the next desired input.

            // If the next expected input is required, grab the next given input.
            if(expectedInput.isRequired()) {
                const input = givenInputs.shift();
                // If there isn't one, exception!
                if(input === undefined)
                    return [ new Halt(evaluator => new ValueException(evaluator), this) ];
                // If the given input is a bind...
                else if(input instanceof Bind) {
                    // And it doesn't have a default value, halt.
                    if(input.value === undefined) 
                        return [ new Halt(evaluator => new SemanticException(evaluator, input), this) ];
                    // But it doesn't correspond to the required input, halt
                    else if(!input.sharesName(expectedInput))
                        return [ new Halt(evaluator => new ValueException(evaluator), this) ];
                    // Otherwise, compile the bind's expression.
                    else
                        return input.value.compile(context);
                }
                // Otherwise, compile the expression.
                else
                    return input.compile(context);
            }
            // If the next expected input is optional...
            else {
                // ... and it's not a variable length input, first search for a named input, otherwise grab the next input.
                if(!expectedInput.isVariableLength()) {
                    const bind = givenInputs.find(g => g instanceof Bind && expectedInput.sharesName(g));
                    // If we found a bind with a matching name and it has a value, compile it's value. Halt if it has no value.
                    if(bind instanceof Bind) {
                        if(bind.value === undefined)
                            return [ new Halt(evaluator => new ValueException(evaluator), this) ];
                        // Remove the given input from the list of inputs
                        givenInputs.splice(givenInputs.indexOf(bind), 1);
                        // Return the compiled value.
                        return bind.value.compile(context);
                    }

                    // If we didn't find a matching bind for this expected input, see if there's a non-bind expression next, use it.
                    const optionalInput = givenInputs.length > 0 && givenInputs[0] instanceof Expression ? givenInputs.shift() : undefined;
                    if(optionalInput !== undefined)
                        return optionalInput.compile(context);
                    
                    // If there wasn't one, use the expected input's default value.
                    return expectedInput.value === undefined ? 
                        [ new Halt(evaluator => new SemanticException(evaluator, expectedInput), this) ] :
                        expectedInput.value.compile(context);
                }
                // If it is a variable length input, reduce the remaining given input expressions into a list of steps.
                else {
                    return givenInputs.reduce((prev: Step[], next) =>
                        [
                            ...prev, 
                            ...(
                                next instanceof Bind ? 
                                    (
                                        next.value === undefined ? 
                                            [ new Halt(evaluator => new SemanticException(evaluator, next), this) ] : 
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
            new Start(this),
            ...inputSteps.reduce((steps: Step[], s) => [ ...steps, ...s], []), 
            ...this.func.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Get the function off the stack and bail if it's not a function.
        const functionOrStructure = evaluator.popValue(undefined);
        if(!(functionOrStructure instanceof FunctionValue || functionOrStructure instanceof StructureDefinitionValue)) 
            return new FunctionException(evaluator, this, functionOrStructure, this.func.toWordplay());

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
            const value = evaluator.popValue(undefined);
            if(value instanceof Exception) return value;
            else values.unshift(value);
        }
        
        if(functionOrStructure instanceof FunctionValue) {

            const definition = functionOrStructure.definition;
            const body = functionOrStructure.definition.expression;

            // Bail if the function's body isn't an expression.
            if(!(body instanceof Expression))
                return new SemanticException(evaluator, body);

            // Build the bindings.
            const bindings = this.buildBindings(evaluator, definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            evaluator.startEvaluation(new Evaluation(
                evaluator, 
                this,
                definition, 
                body, 
                functionOrStructure.context, 
                bindings)
            );

        }
        else if(functionOrStructure instanceof StructureDefinitionValue) {

            // Build the custom type's bindings.
            const bindings = this.buildBindings(evaluator, functionOrStructure.definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            // Evaluate the structure's block with the bindings, generating an evaluation context with the
            // type's inputs and functions.
            evaluator.startEvaluation(new Evaluation(evaluator, this, functionOrStructure.definition, functionOrStructure.definition.block ?? new Block([], true, true), evaluator.getEvaluationContext(), bindings));

        }

    }

    buildBindings(evaluator: Evaluator, inputs: (Bind | Unparsable)[], values: Value[], ): Map<string, Value> | Exception {

        // Build the bindings, backwards because they are in reverse on the stack.
        const bindings = new Map<string, Value>();
        for(let i = 0; i < inputs.length; i++) {
            const bind = inputs[i];
            if(bind instanceof Unparsable) return new SemanticException(evaluator, bind);
            else if(i >= values.length) 
                return new ValueException(evaluator);
            bind.names.names.forEach(name => {
                const n = name.getName();
                if(n !== undefined)
                    bindings.set(
                        n, 
                        bind.isVariableLength() ? 
                            new List(this, values.slice(i)) :
                            values[i]
                    )
            });
        }
        return bindings;

    }
 
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.func instanceof Expression) this.func.evaluateTypeSet(bind, original, current, context);
        this.inputs.forEach(input => { if(input instanceof Expression) input.evaluateTypeSet(bind, original, current, context); });
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
        
        const functionType = this.func.getTypeUnlessCycle(context);
        if(!(functionType instanceof FunctionDefinitionType || functionType instanceof StructureType))
            return;

        // Type inputs can be any type
        if(this.typeInputs.includes(child as TypeInput))
            return getPossibleTypeReplacements(child, context);
        
        // Functions can be any function names in scope
        if(child === this.func)
            return  this.getDefinitions(this, context)
                    .filter((def): def is FunctionDefinition => def instanceof FunctionDefinition)
                    .map(fun => new Replace<Reference>(context.source, child, [ name => new Reference(name), fun ]))
        
        // Input expressions should match whatever the function expects, if there is one.
        const index = this.inputs.indexOf(child as InputType);
        if(index >= 0) {
            const input = this.inputs[index];
            if(input instanceof Expression) {

                const bind = functionType instanceof FunctionDefinitionType ? functionType.fun.inputs[index] : functionType.structure.inputs[index];
                if(bind === undefined || bind instanceof Unparsable)
                    return [];

                const expectedType = bind.getType(context);

                return getExpressionReplacements(context.source, this, input, context, expectedType);
            }

        }

    }
    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
        
        const functionType = this.func.getTypeUnlessCycle(context);
        if(!(functionType instanceof FunctionDefinitionType || functionType instanceof StructureType))
            return;

        // If before a type input or the open paren, offer valid type inputs.
        if(this.typeInputs.includes(child as TypeInput) || child === this.open)
            return getPossibleTypeInsertions(this, position, this.typeInputs, child, context);

        // If we're before the close, then see if there are any inputs to append
        if(child === this.close) {

            const index = this.inputs.length;

            const bind = 
                functionType instanceof FunctionDefinitionType ? functionType.fun.inputs[index] : 
                functionType.structure.inputs[index];

            if(bind instanceof Unparsable || bind === undefined)
                return [];

            const expectedType = bind.getType(context);

            // Suggest expressions of the expected type.
            return getExpressionInsertions(context.source, position, this, this.inputs, child, context, expectedType);

        }
    
    }

    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.func) return new Replace(context.source, child, new ExpressionPlaceholder());
        else if(this.typeInputs.includes(child as TypeInput) || this.inputs.includes(child as InputType)) return new Remove(context.source, this, child);    
    }

    getChildPlaceholderLabel(child: Node, context: Context): Translations | undefined {
        // Find the corresponding input's definition, getting names from the Binds.
        if(child === this.func) 
            return {
                "😀": TRANSLATE,
                eng: "function"    
            }
        if(this.inputs.includes(child as InputType)) {
            const index = this.inputs.indexOf(child as InputType);
            if(index >= 0) {
                const funType = this.func.getTypeUnlessCycle(context);
                if(funType instanceof FunctionDefinitionType && index < funType.fun.inputs.length) {
                    const bind = funType.fun.inputs[index];
                    if(bind instanceof Bind) {
                        return bind.names.getTranslations();
                    }
                }
                else if(funType instanceof StructureType && index < funType.structure.inputs.length) {
                    const bind = funType.structure.inputs[index];
                    if(bind instanceof Bind) {
                        return bind.names.getTranslations();
                    }
                }
            }
        }
    }

    getDescriptions(context: Context): Translations {
        const descriptions: Translations = {
            "😀": TRANSLATE,
            eng: "Evaluate an unknown function"
        }

        // Find the function on the left's type.
        const fun = this.getFunction(context);
        return fun !== undefined ? overrideWithDocs(descriptions, fun.docs) : descriptions;
        
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "We first have to evaluate all of the inputs, then the function to evaluate."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now that we have the inputs and the function, we can start evaluating the function."
        }
    }


}