import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import type Conflict from "../conflicts/Conflict";
import { typeVarsAreUnique, getEvaluationInputConflicts } from "./util";
import type Evaluator from "../runtime/Evaluator";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import type Context from "./Context";
import type Definition from "./Definition";
import Name from "./Name";
import { BinaryOpRegEx, FUNCTION_SYMBOL, TYPE_SYMBOL } from "../parser/Tokenizer";
import type { TypeSet } from "./UnionType";
import ContextException, { StackSize } from "../runtime/ContextException";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import { getPossibleTypeReplacements } from "../transforms/getPossibleTypes";
import { getExpressionReplacements } from "../transforms/getPossibleExpressions";
import AnyType from "./AnyType";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import type Transform from "../transforms/Transform"
import Append from "../transforms/Append";
import EvalCloseToken from "./EvalCloseToken";
import EvalOpenToken from "./EvalOpenToken";
import Remove from "../transforms/Remove";
import Replace from "../transforms/Replace";
import Docs from "./Docs";
import Names from "./Names";
import type LanguageCode from "./LanguageCode";
import FunctionDefinitionType from "./FunctionDefinitionType";
import UnknownType from "./UnknownType";
import type Value from "../runtime/Value";
import StartFinish from "../runtime/StartFinish";

export default class FunctionDefinition extends Expression {

    readonly docs?: Docs;
    readonly fun: Token;
    readonly names: Names;
    readonly typeVars: TypeVariable[];
    readonly open: Token;
    readonly inputs: Bind[];
    readonly close?: Token;
    readonly dot?: Token;
    readonly output?: Type;
    readonly expression: Expression | Token;

    constructor(
        docs: Docs | undefined, 
        fun: Token,
        names: Names, 
        typeVars: TypeVariable[], 
        open: Token,
        inputs: Bind[],
        close: Token | undefined, 
        dot: Token | undefined,
        output: Type | undefined,
        expression: Expression | Token, 
    ) {
        super();

        this.docs = docs;
        this.names = names;
        this.fun = fun;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot = dot;
        this.output = output;
        this.expression = expression;

        this.computeChildren();

    }

    static make(docs: Translations | undefined, names: Translations | Names, typeVars: TypeVariable[], inputs: Bind[], expression: Expression | Token, output?: Type) {
        return new FunctionDefinition(
            docs ? new Docs(docs) : undefined,
            new Token(FUNCTION_SYMBOL, TokenType.FUNCTION),
            names instanceof Names ? names : Names.make(names),
            typeVars,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            output === undefined ? undefined : new Token(TYPE_SYMBOL, TokenType.TYPE),
            output,
            expression,
        );
    }

    getGrammar() { 
        return [
            { name: "docs", types:[ Docs, undefined ] },
            { name: "fun", types:[ Token ] },
            { name: "names", types:[ Names ] },
            { name: "typeVars", types:[[ TypeVariable ]] },
            { name: "open", types:[ Token ] },
            { name: "inputs", types:[[ Bind ]] },
            { name: "close", types:[ Token, undefined] },
            { name: "dot", types:[ Token, undefined ] },
            { name: "output", types:[ Type, undefined ] },
            { name: "expression", types:[ Expression, Token ] },
        ];
    }

    isBlockFor(child: Node) { return child === this.expression; }

    getPreferredPrecedingSpace(child: Node, space: string, depth: number): string {
        // If the block has more than one statement, and the space doesn't yet include a newline followed by the number of types tab, then prefix the child with them.
        return this.expression === child && space.indexOf("\n") >= 0 ? `${"\t".repeat(depth)}` : "";
    }

    replace(original?: Node, replacement?: Node) { 
        return new FunctionDefinition(
            this.replaceChild("docs", this.docs, original, replacement), 
            this.replaceChild("fun", this.fun, original, replacement), 
            this.replaceChild<Names>("names", this.names, original, replacement),
            this.replaceChild("typeVars", this.typeVars, original, replacement), 
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild("inputs", this.inputs, original, replacement), 
            this.replaceChild("close", this.close, original, replacement),
            this.replaceChild("dot", this.dot, original, replacement), 
            this.replaceChild("output", this.output, original, replacement), 
            this.replaceChild<Expression|Token>("expression", this.expression, original, replacement)
        ) as this;
    }

    sharesName(fun: FunctionDefinition) { return this.names.sharesName(fun.names); }

    hasName(name: string) { return this.names.hasName(name); }
    getNames() { return this.names.getNames(); }
    getTranslation(lang: LanguageCode[]) { return this.names.getTranslation(lang); }

    isOperator() { return this.inputs.length === 1 && this.getOperatorName() !== undefined; }
    
    getOperatorName() { 
        return this.names.getNames().find(name => BinaryOpRegEx.test(name));
    }

    /**
     * Name, inputs, and outputs must match.
     */
    accepts(fun: FunctionDefinition, context: Context) {

        if(!this.sharesName(fun)) return false;
        for(let i = 0; i < this.inputs.length; i++) {
            if(i >= fun.inputs.length) return false;
            if(!this.inputs[i].getTypeUnlessCycle(context).accepts(fun.inputs[i].getTypeUnlessCycle(context), context)) return false;
        }
        return this.getOutputType(context).accepts(fun.getOutputType(context), context);

    }

    isEvaluationInvolved() { return true; }
    isEvaluationRoot() { return true; }
    isBindingEnclosureOfChild(child: Node): boolean { return child === this.expression || child === this.output || this.inputs.includes(child as Bind); }

    computeConflicts(): Conflict[] { 

        let conflicts: Conflict[] = [];
        
        // Type variables must have unique names.
        const duplicateTypeVars = typeVarsAreUnique(this.typeVars);
        if(duplicateTypeVars) conflicts.push(duplicateTypeVars);

        // Make sure the inputs are valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        return conflicts; 
    
    }

    getDefinitions(node: Node): Definition[] {

        // Does an input delare the name that isn't the one asking?
        return [ 
            ... this.inputs.filter(i => i instanceof Bind && i !== node) as Bind[], 
            ... this.typeVars.filter(t => t instanceof TypeVariable) as TypeVariable[]
        ];
        
    }

    computeType(): Type {
        return new FunctionDefinitionType(this);
    }

    getOutputType(context: Context) {
        return this.output instanceof Type ? this.output : 
            !(this.expression instanceof Expression) ? new UnknownType({ placeholder: this.expression }) : 
            this.expression.getTypeUnlessCycle(context);
    }

    /** Functions have no dependencies; once they are defined, they cannot change what they evaluate to. */
    getDependencies(): Expression[] {
        return this.expression instanceof Expression ? [ this.expression ] : [];
    }

    compile(): Step[] {
        return [ new StartFinish(this) ];
    }

    getStart() { return this.fun; }
    getFinish() { return this.names; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Let's define this function and bind it to this name."
        }
    }

    evaluate(evaluator: Evaluator): Value | undefined {

        // We ignore any prior values; must capture closures every time.

        // Get the function value.
        const context = evaluator.getCurrentEvaluation();
        const value = context === undefined ? 
            new ContextException(StackSize.EMPTY, evaluator) : 
            new FunctionValue(this, context);

        // Bind the value
        evaluator.bind(this.names, value);

        // Return the value.
        return value;

    }

    isAbstract() { return this.expression instanceof Token && this.expression.is(TokenType.ETC); }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression) this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions(): Translations {
        const defaultDocs = { 
            "😀": TRANSLATE,
            eng: "A named function" 
        };
        return this.docs ? overrideWithDocs(defaultDocs, this.docs) : defaultDocs;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        if(child === this.output)
            return getPossibleTypeReplacements(child, context);
        // Expression must be of output type, or any type if there isn't one.
        else if(child === this.expression && this.expression instanceof Expression)
            return getExpressionReplacements(this, this.expression, context, this.output === undefined ? new AnyType() : this.output);

    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {

        const newBind = Bind.make(undefined, new Names([Name.make()]));

        if(child === this.close)
            return [ new Append(context, position, this, this.inputs, this.close, newBind)]
        else if(this.inputs.includes(child as Bind))
            return [ new Append(context, position, this, this.inputs, child, newBind) ];

    }

    getInsertionAfter(): Transform[] | undefined { return []; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if( this.typeVars.includes(child as TypeVariable) || 
            this.inputs.includes(child as Bind))
            return new Remove(context, this, child);
        else if(child === this.output && this.dot) return new Remove(context, this, this.dot, this.output);
        else if(child === this.expression) return new Replace(context, child, new ExpressionPlaceholder());    
    }

}