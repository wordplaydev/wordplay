import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import type Evaluator from "src/runtime/Evaluator";
import type Step from "../runtime/Step";
import Finish from "../runtime/Finish";
import Start from "../runtime/Start";
import type Context from "./Context";
import type Node from "./Node";
import { AND_SYMBOL, OR_SYMBOL } from "../parser/Tokenizer";
import OrderOfOperations from "../conflicts/OrderOfOperations";
import Bind from "./Bind";
import type { TypeSet } from "./UnionType";
import FunctionException from "../runtime/FunctionException";
import JumpIf from "../runtime/JumpIf";
import FunctionDefinition from "./FunctionDefinition";
import FunctionType from "./FunctionType";
import UnexpectedInputs from "../conflicts/UnexpectedInputs";
import MissingInput from "../conflicts/MissingInput";
import IncompatibleInput from "../conflicts/IncompatibleInput";
import Evaluation from "../runtime/Evaluation";
import SemanticException from "../runtime/SemanticException";
import NotAFunction from "../conflicts/NotAFunction";
import MeasurementType from "./MeasurementType";
import getPossibleExpressions from "./getPossibleExpressions";
import AnyType from "./AnyType";
import TokenType from "./TokenType";
import Reference from "./Reference";

export default class BinaryOperation extends Expression {

    readonly operator: Token;
    readonly left: Expression | Unparsable;
    readonly right: Expression | Unparsable;

    constructor(operator: Token, left: Expression | Unparsable, right: Expression | Unparsable) {
        super();

        this.operator = operator;
        this.left = left;
        this.right = right;
    }

    getOperator() { return this.operator.text.toString(); }

    computeChildren() {
        return [ this.left, this.operator, this.right ];
    }

    getFunctionDefinition(context: Context) {

        // Find the function on the left's type.
        const leftType = this.left instanceof Expression ? this.left.getTypeUnlessCycle(context) : undefined;
        const fun = leftType?.getDefinitionOfName(this.getOperator(), context, this);
        return fun instanceof FunctionDefinition ? fun : undefined;

    }

    computeConflicts(context: Context): Conflict[] { 

        const conflicts = [];

        // Warn on sequences of different operators about evaluation order.
        if(this.left instanceof BinaryOperation && this.operator.getText() !== this.left.operator.getText())
            conflicts.push(new OrderOfOperations(this.left, this));

        // Get the types
        const rightType = this.right instanceof Expression ? this.right.getTypeUnlessCycle(context) : undefined;

        // Find the function on the left's type.
        const fun = this.getFunctionDefinition(context);

        // Did we find nothing?
        if(fun === undefined) {
            conflicts.push(new NotAFunction(this, this.left.getTypeUnlessCycle(context), undefined));
        }
        // If it is a function, does the right match the expected input?
        else {
            const funType = fun.getType(context);
            if(funType instanceof FunctionType) {
                // Are there too many inputs?
                if(fun.inputs.length === 0)
                    conflicts.push(new UnexpectedInputs(funType, this, [ this.right ])); 
                // Are there too few inputs?
                else if(fun.inputs.length > 1) {
                    const secondInput = fun.inputs[1];
                    if(secondInput instanceof Bind)
                        conflicts.push(new MissingInput(funType, this, secondInput));
                }
                // Is the right operand the correct type?
                else {
                    const firstInput = fun.inputs[0];
                    const expectedType = firstInput.getType(context);
                    // Pass this binary operation to the measurement type so it can reason about units correctly.
                    if(this.right instanceof Expression && rightType !== undefined && !(expectedType instanceof MeasurementType ? expectedType.accepts(rightType, context, this) : expectedType.accepts(rightType, context)))
                        conflicts.push(new IncompatibleInput(funType, this, this.right, rightType, expectedType));
                }
            }
        }

        return conflicts;
    
    }

    computeType(context: Context): Type {

        // The type of the expression is whatever the function definition says it is.
        const functionType = this.getFunctionDefinition(context)?.getTypeUnlessCycle(context);
        return functionType instanceof FunctionType && functionType.output instanceof Type ? functionType.output : new UnknownType(this);

    }

    compile(context: Context): Step[] {

        const left = this.left.compile(context);
        const right = this.right.compile(context);

        // Logical and is short circuited: if the left is false, we do not evaluate the right.
        if(this.operator.getText() === AND_SYMBOL) {
            return [ 
                new Start(this), 
                ...left,
                // Jump past the right's instructions if false and just push a false on the stack.
                new JumpIf(right.length + 1, true, false, this),
                ...right, 
                new Finish(this)
            ];
        }
        // Logical OR is short circuited: if the left is true, we do not evaluate the right.
        else if(this.operator.getText() === OR_SYMBOL) {
            return [ 
                new Start(this), 
                ...left,
                // Jump past the right's instructions if true and just push a true on the stack.
                new JumpIf(right.length + 1, true, true, this),
                ...right, 
                new Finish(this)
            ];
        }
        else {
            return [ new Start(this), ...left, ...right, new Finish(this) ];
        }
    }

    getStartExplanations() { 
        return {
            "eng": "We first evaluate the left and right."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "We end by performing the operation on the left and right."
        }
    }

    evaluate(evaluator: Evaluator) {

        const right = evaluator.popValue(undefined);
        const left = evaluator.popValue(undefined);

        const fun = left.getType(evaluator.getContext()).getDefinitionOfName(this.getOperator(), evaluator.getContext(), this);
        if(!(fun instanceof FunctionDefinition) || !(fun.expression instanceof Expression))
            return new FunctionException(evaluator, this, left, this.getOperator());

        const operand = fun.inputs[0];
        if(!(operand instanceof Bind))
            return new SemanticException(evaluator, operand);

        // Start the function's expression.
        evaluator.startEvaluation(new Evaluation(evaluator, fun, fun.expression, left, new Map().set(operand.names[0].getName(), right)));

        // No values to return, the evaluation will compute it.
        return undefined;

    }

    clone(original?: Node, replacement?: Node) { 
        return new BinaryOperation(
            this.operator.cloneOrReplace([ Token ], original, replacement), 
            this.left.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.right.cloneOrReplace([ Expression, Unparsable ], original, replacement)
        ) as this; 
    }

    /** 
     * Type checks narrow the set to the specified type, if contained in the set and if the check is on the same bind.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        // If conjunction, then we compute the intersection of the left and right's possible types.
        // Note that we pass the left's possible types because we don't evaluate the right if the left isn't true.
        if(this.operator.getText() === AND_SYMBOL) {
            const left = this.left instanceof Unparsable ? current : this.left.evaluateTypeSet(bind, original, current, context);
            const right = this.right instanceof Unparsable ? current : this.right.evaluateTypeSet(bind, original, left, context);
            return left.intersection(right, context);
        }
        // If disjunction of type checks, then we return the union.
        // Note that we pass the left's possible types because we don't evaluate the right if the left is true.
        else if(this.operator.getText() === OR_SYMBOL) {
            const left = this.left instanceof Unparsable ? current : this.left.evaluateTypeSet(bind, original, current, context);
            const right = this.right instanceof Unparsable ? current : this.right.evaluateTypeSet(bind, original, left, context);
            return left.union(right, context);
        }
        // Otherwise, just pass the types down and return the original types.
        else {
            if(!(this.left instanceof Unparsable)) this.left.evaluateTypeSet(bind, original, current, context);
            if(!(this.right instanceof Unparsable)) this.right.evaluateTypeSet(bind, original, current, context);
            return current;
        }
    
    }

    getDescriptions() {
        return {
            eng: "Evaluate an operation with two inputs."
        }
    }

    getChildReplacements(child: Node, context: Context): (Node | Reference<Node>)[] {
        
        const expectedType = this.getFunctionDefinition(context)?.inputs[0]?.getType(context);

        // Left can be anything
        if(child === this.left) {
            return getPossibleExpressions(this, this.left, context);
        }
        // Operator must exist on the type of the left, unless not specified
        else if(child === this.operator) {
            const leftType = this.left instanceof Expression ? this.left.getTypeUnlessCycle(context) : undefined;
            const funs = leftType?.getAllDefinitions(this, context)?.filter((def): def is FunctionDefinition => def instanceof FunctionDefinition && def.inputs.length === 1);
            return funs?.map(fun => new Reference<Token>(fun, name => new Token(name, [ TokenType.BINARY_OP ]))) ?? []
        }
        // Right should comply with the expected type, unless it's not a known function
        else if(child === this.right) {
            return getPossibleExpressions(this, this.right, context, expectedType ?? new AnyType());
        }
        else return [];

    }

}