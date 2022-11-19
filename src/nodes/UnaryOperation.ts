import type Conflict from "../conflicts/Conflict";
import Expression from "./Expression";
import Token from "./Token";
import type Type from "./Type";
import type Node from "./Node";
import UnknownType from "./UnknownType";
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
import Evaluation from "../runtime/Evaluation";
import TokenType from "./TokenType";
import type Transform from "../transforms/Transform"
import Replace from "../transforms/Replace";
import { getPossiblePostfix } from "../transforms/getPossibleExpressions";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type LanguageCode from "./LanguageCode";
import getConcreteExpectedType from "./Generics";

export default class UnaryOperation extends Expression {

    readonly operator: Token;
    readonly operand: Expression;

    constructor(operator: Token, operand: Expression) {
        super();

        this.operator = operator;
        this.operand = operand;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "operator", types:[ Token ] },
            { name: "operand", types:[ Expression ] },
        ]; 
    }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new UnaryOperation(
            this.replaceChild(pretty, "operator", this.operator, original, replacement), 
            this.replaceChild(pretty, "operand", this.operand, original, replacement)
        ) as this; 
    }

    getOperator() { return this.operator.text.toString(); }

    getFunction(context: Context) {

        // Find the function on the left's type.
        const expressionType = this.operand instanceof Expression ? this.operand.getTypeUnlessCycle(context) : undefined;
        const fun = expressionType?.getDefinitionOfName(this.getOperator(), context, this);
        return fun instanceof FunctionDefinition ? fun : undefined;

    }

    computeConflicts(context: Context): Conflict[] { 
    
        const conflicts = [];

        // Find the function on the left's type.
        const fun = this.getFunction(context);

        // Did we find nothing?
        if(fun === undefined)
            conflicts.push(new NotAFunction(this, this.operator));

        return conflicts;
    
    }

    computeType(context: Context): Type {

        const fun = this.getFunction(context);
        return fun !== undefined ? 
            getConcreteExpectedType(fun, undefined, this, context) :
            new UnknownType({ definition: this, name: this.operator });

    }
    
    compile(context: Context):Step[] {
        return [
            new Start(this),
            ...this.operand.compile(context),
            new Finish(this)
        ];
    }

    evaluate(evaluator: Evaluator) {

        // Get the value of the operand.
        const value = evaluator.popValue(undefined);

        const fun = value.getType(evaluator.getContext()).getDefinitionOfName(this.getOperator(), evaluator.getContext(), this);
        if(!(fun instanceof FunctionDefinition) || !(fun.expression instanceof Expression))
            return new FunctionException(evaluator, this, value, this.getOperator());

        // Start the function's expression.
        evaluator.startEvaluation(new Evaluation(evaluator, this, fun, fun.expression, value, new Map()));

        // No values to return, the evaluation will compute it.
        return undefined;

    }

    /** 
     * Logical negations take the set complement of the current set from the original.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        // We only manipulate possible types for logical negation operators.
        if(this.operator.getText() !== NOT_SYMBOL) return current;

        // Get the possible types of the operand.
        const possible = this.operand.evaluateTypeSet(bind, original, current, context);

        // Return the difference between the original types and the possible types, 
        return original.difference(possible, context);

    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
        
        // Operator must exist on the type of the left, unless not specified
        if(child === this.operator) {
            const expressionType = this.operand instanceof Expression ? this.operand.getTypeUnlessCycle(context) : undefined;
            const funs = expressionType?.getAllDefinitions(this, context).filter((def): def is FunctionDefinition => def instanceof FunctionDefinition && def.inputs.length === 0);;
            return funs?.map(fun => new Replace(context.source, child, new Token(fun.getNames()[0] as string, TokenType.UNARY_OP))) ?? []
        }

        return [];

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter(context: Context): Transform[] | undefined { return getPossiblePostfix(context, this, this.getType(context)); }
    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if(child === this.operand) return new Replace(context.source, child, new ExpressionPlaceholder());
    }

    getDescriptions(context: Context): Translations {
        const descriptions: Translations = {
            "😀": TRANSLATE,
            eng: "Evaluate an unknown unary on a value"
        }

        // Find the function on the left's type.
        const fun = this.getFunction(context);
        if(fun !== undefined) {
            for(const doc of fun.docs.docs) {
                const lang = doc.getLanguage();
                if(lang !== undefined)
                    descriptions[lang as LanguageCode] = doc.docs.getText();
            }
        }

        return descriptions;
        
    }

    getStartExplanations(): Translations { 
        return {
            "😀": TRANSLATE,
            eng: "First we evaluate the operand."
        }
     }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Now that we have the operand, we operate on it."
        }
    }

}