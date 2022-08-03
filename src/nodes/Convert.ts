import Conflict, { UnknownConversion } from "../parser/Conflict";
import Expression from "./Expression";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Token from "./Token";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Start from "../runtime/Start";
import Structure from "../runtime/Structure";
import Evaluation from "../runtime/Evaluation";
import type { ConflictContext } from "./Node";

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

    getChildren() { return [ this.expression, this.type ]; }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        // The expression's type must have a conversion.
        const exprType = this.expression.getType(context);
        if(this.type instanceof Type && exprType.getConversion(context, this.type) === undefined)
            return [ new UnknownConversion(this, this.type) ];
        
        return []; 
    
    }

    getType(context: ConflictContext): Type {
        // Whatever this converts to.
        return this.type instanceof Type ? this.type : new UnknownType(this);
    }

    compile(): Step[] {
        return [ new Start(this), ...this.expression.compile(), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        
        if(this.type instanceof Unparsable) return new Exception(this, ExceptionType.UNPARSABLE);

        const value = evaluator.popValue();
        if(value instanceof Exception) return value;
        else if(value instanceof Structure) {

            // Find the conversion function on the structure.
            const conversion = value.getConversion(this.type);
            if(conversion === undefined) return new Exception(this, ExceptionType.UNKNOWN_CONVERSION);

            // If we found one, then execute it to get a value of the appropriate type on the value stack.
            evaluator.startEvaluation(
                new Evaluation(
                    conversion.definition, 
                    conversion.definition.expression, 
                    evaluator.getEvaluationContext()
                )
            );

        }
        else return new Exception(this, ExceptionType.UNKNOWN_CONVERSION);


    }

}