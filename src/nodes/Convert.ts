import type Conflict from "../conflicts/Conflict";
import { UnknownConversion } from "../conflicts/UnknownConversion";
import Expression from "./Expression";
import Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import Token from "./Token";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Action from "../runtime/Start";
import Evaluation from "../runtime/Evaluation";
import type Context from "./Context";
import ConversionValue from "../runtime/ConversionValue";
import type Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import SemanticException from "../runtime/SemanticException";
import ConversionType from "./ConversionType";
import AnyType from "./AnyType";
import FunctionException from "../runtime/FunctionException";
import Exception from "../runtime/Exception";

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

    getConversionDefinition(context: Context) {

        // The expression's type must have a conversion.
        const exprType = this.expression.getTypeUnlessCycle(context);
        return this.type instanceof Type ? 
            exprType.getConversion(context, this.type) :
            undefined;
        
    }

    computeConflicts(context: Context): Conflict[] { 
        
        // If we know the expression's type, there must be a corresponding conversion on that type.
        const exprType = this.expression.getTypeUnlessCycle(context);
        const conversion = this.getConversionDefinition(context);
        if(!(exprType instanceof UnknownType) && this.type instanceof Type && conversion === undefined)
            return [ new UnknownConversion(this, this.type) ];
        
        return [];
    
    }

    computeType(context: Context): Type {
        
        // Get the conversion definition.
        const definition = this.getConversionDefinition(context);
        return definition === undefined || !(definition.output instanceof Type) ? new UnknownType(this) : definition.output; 

    }

    compile(context: Context):Step[] {

        // Evaluate the expression to convert, then push the conversion function on the stack.
        return [ 
            ...this.expression.compile(context),
            new Action(this, evaluator => {
                const evaluation = evaluator.getEvaluationContext();
                const conversion = this.getConversionDefinition(context);
                return evaluation === undefined || conversion === undefined ? 
                    new FunctionException(evaluator, evaluator.peekValue(), this.type.toWordplay()) : 
                    new ConversionValue(conversion, evaluation);
            }), 
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator) {
        
        if(this.type instanceof Unparsable) return new SemanticException(evaluator, this.type);
        
        // Find the conversion function on the structure from compiling.
        const conversion = evaluator.popValue(new ConversionType(new AnyType()));
        if(!(conversion instanceof ConversionValue)) return conversion;

        // Get the value to convert
        const value = evaluator.popValue(undefined);
        if(value instanceof Exception) return value;
        
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

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression)
            this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

}