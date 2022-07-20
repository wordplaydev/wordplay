import Bind from "../nodes/Bind";
import Conflict, { IncompatibleInputs, NotAFunction, NotInstantiable } from "../parser/Conflict";
import StructureDefinition from "./StructureDefinition";
import StructureType from "./StructureType";
import Expression from "./Expression";
import FunctionType from "./FunctionType";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import type TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Evaluation from "../runtime/Evaluation";
import FunctionValue from "../runtime/FunctionValue";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";

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

    getConflicts(program: Program): Conflict[] { 
    
        const conflicts = [];

        if(this.func instanceof Expression) {
            const functionType = this.func.getType(program);

            // The function must be a function.
            if(!(functionType instanceof FunctionType || functionType instanceof StructureType))
                conflicts.push(new NotAFunction(this));
            else { 
                let targetInputs: Type[] | undefined = undefined;
                if(functionType instanceof FunctionType) {
                    const types = functionType.inputs.filter(t => t instanceof Type) as Type[];
                    // Don't do the analysis if any types are unparsable.
                    if(types.length === functionType.inputs.length)
                        targetInputs = types;
                }
                else if(functionType instanceof StructureType) {
                    // Can't create interfaces that don't have missing function definitions.
                    if(functionType.type.isInterface())
                        conflicts.push(new NotInstantiable(this));

                    // Inputs of function or type must match this evaluations inputs.
                    const types = functionType.type.inputs.filter(t => t instanceof Bind).map(b => (b as Bind).getType(program));
                    if(types.length === functionType.type.inputs.length)
                        targetInputs = types;
                }

                // Target inputs must match this evaluation's inputs
                if(targetInputs !== undefined && this.inputs.filter(i => i instanceof Expression).length === this.inputs.length) {
                    // Check the type of every input provided. Ignore the optional inputs, since they have defaults.
                    if(!this.inputs.every((expression, index) =>
                        targetInputs !== undefined && (expression as Expression).getType(program).isCompatible(program, targetInputs[index])))
                        conflicts.push(new IncompatibleInputs(functionType, this));
                }
            }
        }

        return conflicts;
    
    }

    getType(program: Program): Type {
        if(this.func instanceof Unparsable) return new UnknownType(this);
        const funcType = this.func.getType(program);
        if(funcType instanceof FunctionType && funcType.output instanceof Type) return funcType.output;
        if(funcType instanceof StructureType) return funcType.type;
        if(funcType instanceof StructureDefinition) return funcType;
        else return new UnknownType(this);
    }

    compile(): Step[] {
        // Evaluate the function expression, then the inputs, then evaluate this this.
        return [ 
            new Start(this),
            ...this.func.compile(), 
            ...this.inputs.reduce((steps: Step[], input) => [ ...steps, ...input.compile()], []), 
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // Get all the values off the stack.
        const values = [];
        for(let i = 0; i < this.inputs.length; i++) {
            const value = evaluator.popValue();
            if(value instanceof Unparsable) return new Exception(ExceptionType.UNPARSABLE);
            else if(value instanceof Exception) return value;
            else values.unshift(value);
        }

        // Get the function off the stack and bail if it's not a function.
        const functionOrStructure = evaluator.popValue();
        if(functionOrStructure instanceof FunctionValue) {

            // Bail if the function's body isn't an expression.
            if(!(functionOrStructure.definition.expression instanceof Expression))
                return new Exception(ExceptionType.PLACEHOLDER);

            // Build the bindings.
            const bindings = this.buildBindings(functionOrStructure.definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            // Now that all of the inputs are resolved, create an execution context that binds all of the inputs.
            evaluator.startEvaluation(new Evaluation(functionOrStructure.definition, functionOrStructure.definition.expression, functionOrStructure.context, bindings));

        }
        else if(functionOrStructure instanceof StructureDefinitionValue) {

            // Build the custom type's bindings.
            const bindings = this.buildBindings(functionOrStructure.definition.inputs, values);
            if(bindings instanceof Exception) return bindings;

            // Evaluate the type's block with the bindings, generating an evaluation context with the
            // type's inputs and functions.
            evaluator.startEvaluation(new Evaluation(functionOrStructure.definition, functionOrStructure.definition.block, evaluator.getEvaluationContext(), bindings));

        }
        // We don't know how to evaluate anything else...
        else return new Exception(ExceptionType.EXPECTED_TYPE);

    }

    buildBindings(inputs: (Bind | Unparsable)[], values: Value[], ): Map<string, Value> | Exception {

        // Build the bindings, backwards because they are in reverse on the stack.
        const bindings = new Map<string, Value>();
        for(let i = 0; i < inputs.length; i++) {
            const bind = inputs[i];
            if(bind instanceof Unparsable) return new Exception(ExceptionType.UNPARSABLE);
            else if(i >= values.length) return new Exception(ExceptionType.EXPECTED_VALUE);
            bind.names.forEach(name => bindings.set(name.name.text, values[i]));
        }
        return bindings;

    }
    
}