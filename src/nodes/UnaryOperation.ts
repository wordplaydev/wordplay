import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Bind from "./Bind";
import { NOT_SYMBOL } from "../parser/Tokenizer";
import type { TypeSet } from "./UnionType";
import FunctionException from "../runtime/FunctionException";
import FunctionDefinition from "./FunctionDefinition";
import NotAFunction from "../conflicts/NotAFunction";
import FunctionType from "./FunctionType";
import Evaluation from "../runtime/Evaluation";
import TokenType from "./TokenType";
import type Transform from "./Transform"

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly operand: Expression | Unparsable;

    constructor(operator: Token, operand: Expression|Unparsable) {
        super();

        this.operator = operator;
        this.operand = operand;
    }

    getOperator() { return this.operator.text.toString(); }

    getFunctionDefinition(context: Context) {

        // Find the function on the left's type.
        const expressionType = this.operand instanceof Expression ? this.operand.getTypeUnlessCycle(context) : undefined;
        const fun = expressionType?.getDefinitionOfName(this.getOperator(), context, this);
        return fun instanceof FunctionDefinition ? fun : undefined;

    }

    computeChildren() {
        return [ this.operator, this.operand ];
    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        // Find the function on the left's type.
        const fun = this.getFunctionDefinition(context);

        // Did we find nothing?
        if(fun === undefined)
            conflicts.push(new NotAFunction(this, this.operand.getTypeUnlessCycle(context), undefined));

        return conflicts;
    
    }

    computeType(context: Context): Type {

        // The type of the expression is whatever the function definition says it is.
        const functionType = this.getFunctionDefinition(context)?.getTypeUnlessCycle(context);
        return functionType instanceof FunctionType && functionType.output instanceof Type ? functionType.output : new UnknownType(this);

    }
    
    compile(context: Context):Step[] {
        return [
            new Start(this),
            ...this.operand.compile(context),
            new Finish(this)
        ];
    }

    getStartExplanations() { 
        return {
            "eng": "First we evaluate the operand."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we have the operand, we operate on it."
        }
    }

    evaluate(evaluator: Evaluator) {

        // Get the value of the operand.
        const value = evaluator.popValue(undefined);

        const fun = value.getType(evaluator.getContext()).getDefinitionOfName(this.getOperator(), evaluator.getContext(), this);
        if(!(fun instanceof FunctionDefinition) || !(fun.expression instanceof Expression))
            return new FunctionException(evaluator, this, value, this.getOperator());

        // Start the function's expression.
        evaluator.startEvaluation(new Evaluation(evaluator, fun, fun.expression, value, new Map()));

        // No values to return, the evaluation will compute it.
        return undefined;

    }

    clone(original?: Node, replacement?: Node) { 
        return new UnaryOperation(
            this.operator.cloneOrReplace([ Token ], original, replacement), 
            this.operand.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    /** 
     * Logical negations take the set complement of the current set from the original.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        // We only manipulate possible types for logical negation operators.
        if(this.operator.getText() !== NOT_SYMBOL || this.operand instanceof Unparsable) return current;

        // Get the possible types of the operand.
        const possible = this.operand.evaluateTypeSet(bind, original, current, context);

        // Return the difference between the original types and the possible types, 
        return original.difference(possible, context);

    }

    getDescriptions() {
        return {
            eng: "Evaluate a function on a value"
        }
    }

    getChildReplacements(child: Node, context: Context): Transform[] {
        
        // Operator must exist on the type of the left, unless not specified
        if(child === this.operator) {
            const expressionType = this.operand instanceof Expression ? this.operand.getTypeUnlessCycle(context) : undefined;
            const funs = expressionType?.getAllDefinitions(this, context).filter((def): def is FunctionDefinition => def instanceof FunctionDefinition && def.inputs.length === 0);;
            return funs?.map(fun => new Token(fun.getNames()[0] as string, [ TokenType.UNARY_OP ])) ?? []
        }

        return [];

    }


}