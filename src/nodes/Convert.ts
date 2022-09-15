import type Conflict from "../conflicts/Conflict";
import { UnknownConversion } from "../conflicts/UnknownConversion";
import Expression from "./Expression";
import Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import Token from "./Token";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Action from "../runtime/Start";
import Evaluation from "../runtime/Evaluation";
import type { ConflictContext } from "./Node";
import Halt from "../runtime/Halt";
import ConversionValue from "../runtime/ConversionValue";

export default class Convert extends Expression {
    
    readonly expression: Expression;
    readonly convert: Token;
    readonly type: Type | Unparsable;

    constructor(expression: Expression, convert: Token, type: Type | Unparsable) {
        super();

        this.expression = expression;
        this.convert = convert;
        this.type = type;
    }

    computeChildren() { return [ this.expression, this.convert, this.type ]; }

    getConversionDefinition(context: ConflictContext) {

        // The expression's type must have a conversion.
        const exprType = this.expression.getTypeUnlessCycle(context);
        return this.type instanceof Type ? 
            exprType.getConversion(context, this.type) :
            undefined;
        
    }

    computeConflicts(context: ConflictContext): Conflict[] { 
        
        // If we know the expression's type, there must be a corresponding conversion on that type.
        const exprType = this.expression.getTypeUnlessCycle(context);
        const conversion = this.getConversionDefinition(context);
        if(!(exprType instanceof UnknownType) && this.type instanceof Type && conversion === undefined)
            return [ new UnknownConversion(this, this.type) ];
        
        return []; 
    
    }

    computeType(context: ConflictContext): Type {
        // Whatever this converts to.
        return this.type instanceof Type ? this.type : new UnknownType(this);
    }

    compile(context: ConflictContext):Step[] {

        const conversion = this.getConversionDefinition(context);
        if(conversion === undefined)
            return [ new Halt(new Exception(this, ExceptionKind.UNKNOWN_CONVERSION), this) ];

        // Evaluate the expression to convert, then push the conversion function on the stack.
        return [ 
            new Action(this, evaluator => {
                const evaluation = evaluator.getEvaluationContext();
                return evaluation === undefined ? 
                    new Exception(this, ExceptionKind.EXPECTED_CONTEXT) : 
                    new ConversionValue(conversion, evaluation);
            }), 
            ...this.expression.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator) {
        
        if(this.type instanceof Unparsable) return new Exception(this, ExceptionKind.UNPARSABLE);

        // Get the value to convert
        const value = evaluator.popValue();
        if(value instanceof Exception) return value;
        
        // Find the conversion function on the structure from compiling.
        const conversion = evaluator.popValue();
        if(!(conversion instanceof ConversionValue)) return new Exception(this, ExceptionKind.EXPECTED_TYPE);

        // Execute the function.
        evaluator.startEvaluation(
            new Evaluation(
                evaluator,
                conversion.definition, 
                conversion.definition.expression, 
                value
            )
        );

    }

    clone(original?: Node, replacement?: Node) { 
        return new Convert(
            this.expression.cloneOrReplace([ Expression ], original, replacement), 
            this.convert.cloneOrReplace([ Token ], original, replacement), 
            this.type.cloneOrReplace([ Type, Unparsable ], original, replacement)
        ) as this; 
    }

}