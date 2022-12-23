import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import TypeVariable from "./TypeVariables";
import type Conflict from "../conflicts/Conflict";
import { getEvaluationInputConflicts } from "./util";
import type Evaluator from "../runtime/Evaluator";
import FunctionValue from "../runtime/FunctionValue";
import type Step from "../runtime/Step";
import type Context from "./Context";
import type Definition from "./Definition";
import { BinaryOpRegEx, FUNCTION_SYMBOL, TYPE_SYMBOL } from "../parser/Tokenizer";
import type TypeSet from "./TypeSet";
import EvaluationException, { StackSize } from "../runtime/EvaluationException";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import EvalCloseToken from "./EvalCloseToken";
import EvalOpenToken from "./EvalOpenToken";
import Docs from "./Docs";
import Names from "./Names";
import type LanguageCode from "./LanguageCode";
import FunctionDefinitionType from "./FunctionDefinitionType";
import type Value from "../runtime/Value";
import StartFinish from "../runtime/StartFinish";
import type TypeVariables from "./TypeVariables";
import NoExpression from "../conflicts/NoExpression";
import UnimplementedType from "./UnimplementedType";
import AnyType from "./AnyType";

export default class FunctionDefinition extends Expression {

    readonly docs?: Docs;
    readonly fun: Token;
    readonly names: Names;
    readonly types: TypeVariables | undefined;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly dot: Token | undefined;
    readonly output: Type | undefined;
    readonly expression: Expression | Token | undefined;

    constructor(
        docs: Docs | undefined, 
        fun: Token,
        names: Names, 
        types: TypeVariables | undefined, 
        open: Token | undefined,
        inputs: Bind[],
        close: Token | undefined, 
        dot: Token | undefined,
        output: Type | undefined,
        expression: Expression | Token | undefined, 
    ) {
        super();

        this.docs = docs;
        this.names = names;
        this.fun = fun;
        this.types = types;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.dot = dot;
        this.output = output;
        this.expression = expression;

        this.computeChildren();

    }

    static make(docs: Translations | undefined, names: Translations | Names, types: TypeVariables | undefined, inputs: Bind[], expression: Expression | Token, output?: Type) {
        return new FunctionDefinition(
            docs ? new Docs(docs) : undefined,
            new Token(FUNCTION_SYMBOL, TokenType.FUNCTION),
            names instanceof Names ? names : Names.make(names),
            types,
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
            { name: "docs", types: [ Docs, undefined ] },
            { name: "fun", types: [ Token ] },
            { name: "names", types: [ Names ] },
            { name: "types", types: [[ TypeVariable ]] },
            { name: "open", types: [ Token ] },
            { name: "inputs", types: [[ Bind ]] },
            { name: "close", types: [ Token] },
            { name: "dot", types: [ Token, undefined ] },
            { name: "output", types: [ Type, undefined ] },
            { 
                name: "expression", types: [ Expression, Token, undefined ],
                // Must match output type if provided
                getType: () => this.output ?? new AnyType()
            },
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
            this.replaceChild("names", this.names, original, replacement),
            this.replaceChild("types", this.types, original, replacement), 
            this.replaceChild("open", this.open, original, replacement), 
            this.replaceChild("inputs", this.inputs, original, replacement), 
            this.replaceChild("close", this.close, original, replacement),
            this.replaceChild("dot", this.dot, original, replacement), 
            this.replaceChild("output", this.output, original, replacement), 
            this.replaceChild("expression", this.expression, original, replacement)
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
            if(!this.inputs[i].getType(context).accepts(fun.inputs[i].getType(context), context)) return false;
        }
        return this.getOutputType(context).accepts(fun.getOutputType(context), context);

    }

    isEvaluationInvolved() { return true; }
    isEvaluationRoot() { return true; }
    isBindingEnclosureOfChild(child: Node): boolean { return child === this.expression || child === this.output || this.inputs.includes(child as Bind); }

    computeConflicts(): Conflict[] { 

        let conflicts: Conflict[] = [];
        
        // Make sure the inputs are valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        // Warn if there's no expression.
        if(this.expression === undefined) {
            conflicts.push(new NoExpression(this))
        }

        return conflicts; 
    
    }

    getDefinitions(node: Node): Definition[] {

        // Does an input delare the name that isn't the one asking?
        return [ 
            ... this.inputs.filter(i => i instanceof Bind && i !== node) as Bind[], 
            ... (this.types ? this.types.variables : [])
        ];
        
    }

    computeType(): Type {
        return new FunctionDefinitionType(this);
    }

    getOutputType(context: Context) {
        return this.output instanceof Type ? this.output : 
            !(this.expression instanceof Expression) ? new UnimplementedType(this) : 
            this.expression.getType(context);
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

    evaluate(evaluator: Evaluator): Value {

        // We ignore any prior values; must capture closures every time.

        // Get the function value.
        const context = evaluator.getCurrentEvaluation();
        const value = context === undefined ? 
            new EvaluationException(StackSize.EMPTY, evaluator) : 
            new FunctionValue(this, context);

        // Bind the value
        evaluator.bind(this.names, value);

        // Return the value.
        return value;

    }

    isAbstract() { return this.expression instanceof Token && this.expression.is(TokenType.PLACEHOLDER); }

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

}

