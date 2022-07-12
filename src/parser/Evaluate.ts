import Bind from "./Bind";
import Conflict from "./Conflict";
import CustomType from "./CustomType";
import CustomTypeType from "./CustomTypeType";
import Expression from "./Expression";
import FunctionType from "./FunctionType";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type { Token } from "./Token";
import Type from "./Type";
import type TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";

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
            if(!(functionType instanceof FunctionType || functionType instanceof CustomTypeType))
                conflicts.push(new Conflict(this, SemanticConflict.NOT_A_FUNCTION_OR_TYPE))
            else { 
                let targetInputs: Type[] | undefined = undefined;
                if(functionType instanceof FunctionType) {
                    const types = functionType.inputs.filter(t => t instanceof Type) as Type[];
                    // Don't do the analysis if any types are unparsable.
                    if(types.length === functionType.inputs.length)
                        targetInputs = types;
                }
                else if(functionType instanceof CustomTypeType) {
                    // Can't create interfaces that don't have missing function definitions.
                    if(functionType.type.isInterface())
                        conflicts.push(new Conflict(this, SemanticConflict.CANT_CREATE_INTERFACES))

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
                        conflicts.push(new Conflict(this, SemanticConflict.INPUT_TYPES_MISMATCH))
                }
            }
        }

        return conflicts;
    
    }

    getType(program: Program): Type {
        if(this.func instanceof Unparsable) return new UnknownType(this);
        const funcType = this.func.getType(program);
        if(funcType instanceof FunctionType && funcType.output instanceof Type) return funcType.output;
        if(funcType instanceof CustomTypeType) return funcType.type;
        if(funcType instanceof CustomType) return funcType;
        else return new UnknownType(this);
    }

}