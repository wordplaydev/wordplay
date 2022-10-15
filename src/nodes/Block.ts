import type Node from "./Node";
import Bind from "./Bind";
import type Conflict from "../conflicts/Conflict";
import { ExpectedEndingExpression } from "../conflicts/ExpectedEndingExpression";
import { IgnoredExpression } from "../conflicts/IgnoredExpression";
import Documentation from "./Documentation";
import Expression from "./Expression";
import Share from "./Share";
import Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { getDuplicateDocs } from "./util";
import type Evaluator from "../runtime/Evaluator";
import Start from "../runtime/Start";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import Structure from "../runtime/Structure";
import type Context from "./Context";
import type Definition from "./Definition";
import StructureDefinition from "./StructureDefinition";
import FunctionDefinition from "./FunctionDefinition";
import type { TypeSet } from "./UnionType";
import ValueException from "../runtime/ValueException";
import ContextException, { StackSize } from "../runtime/ContextException";
import None from "../runtime/None";
import ConversionDefinition from "./ConversionDefinition";
import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL } from "../parser/Tokenizer";
import TokenType from "./TokenType";
import getPossibleExpressions from "./getPossibleExpressions";
import ExpressionPlaceholder from "./ExpressionPlaceholder";
import Alias from "./Alias";
import { Position, type Replacement } from "./Node";

export type Statement = Expression | Unparsable | Share | Bind;

export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly statements: Statement[];
    readonly close?: Token | Unparsable;
    readonly docs: Documentation[];
    readonly root: boolean;
    readonly creator: boolean;

    constructor(docs: Documentation[], statements: Statement[], root: boolean, creator: boolean, open?: Token | Unparsable, close?: Token | Unparsable) {
        super();

        this.open = !root && open === undefined ? new Token(EVAL_OPEN_SYMBOL, [ TokenType.EVAL_OPEN ]) : open;
        this.statements = statements.slice();
        this.close = !root && close === undefined ? new Token(EVAL_CLOSE_SYMBOL, [ TokenType.EVAL_CLOSE ]) : close;
        this.docs = docs;
        this.root = root;
        this.creator = creator;
    }

    getLast() { return this.statements.length === 0 ? undefined : this.statements[this.statements.length - 1]; }

    isBindingEnclosureOfChild(): boolean { return true; }

    computeChildren() {
        return [ ...this.docs, ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }

    computeConflicts(): Conflict[] {

        const conflicts = [];

        // Blocks can't be empty. And if they aren't empty, the last statement must be an expression.
        if(!this.root && !this.creator && (this.statements.length === 0 || !(this.statements[this.statements.length  - 1] instanceof Expression)))
            conflicts.push(new ExpectedEndingExpression(this));

        // The only expression allowed is the last one.
        this.statements
            .slice(0, this.statements.length - 1)
            .filter(s => (s instanceof Expression && !(s instanceof StructureDefinition || s instanceof FunctionDefinition || s instanceof ConversionDefinition)))
            .forEach(s => conflicts.push(new IgnoredExpression(s as Expression)));

        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs) conflicts.push(duplicateDocs);

        return conflicts;
        
    }

    getStatementIndexContaining(node: Node): number | undefined {

        const containingStatement = this.statements.find(s => s.contains(node));
        if(containingStatement === undefined) return;
        const index = this.statements.indexOf(containingStatement);
        if(index < 0) return;
        return index;

    }

    getDefinitions(node: Node): Definition[] {

        const index = this.getStatementIndexContaining(node);
        if(index === undefined) return [];

        // Do any of the binds, shares, structure, or function definitions declare it?
        return this.statements.filter((s, i)  => 
            // Note that we allow an bind to refer to itself, since bound reactions can refer to themselves.
            i <= index &&
            (
                s instanceof Bind ||
                s instanceof Share && s.bind instanceof Bind ||
                s instanceof StructureDefinition || 
                s instanceof FunctionDefinition
            )
        ).map(s => s instanceof Share ? s.bind : s) as Definition[];
        
    }
 
    computeType(context: Context): Type {
        // The type of the last expression.
        const lastExpression = this.statements.slice().reverse().find(s => s instanceof Expression) as Expression | undefined;
        return lastExpression === undefined ? new UnknownType(this) : lastExpression.getTypeUnlessCycle(context);
    }

    compile(context: Context):Step[] {

        // If there are no statements, halt on exception.
        return !this.creator && this.statements.length === 0 ? 
            [ new Halt(evaluator => new ValueException(evaluator), this) ] :
            [ 
                new Start(this), 
                ...this.statements.reduce((prev: Step[], current) => [ ...prev, ...current.compile(context) ], []),
                new Finish(this) 
            ];

    }

    getStartExplanations() { 
        return {
            "eng": "We'll evaluate all of the expressions first."
        }
     }

    getFinishExplanations() {
        return {
            "eng": "Now that we're done, we'll evaluate to the last expression's value."
        }
    }

    evaluate(evaluator: Evaluator) {

        // If this block is creating a structure, take the context and bindings we just created
        // and convert it into a structure.
        if(this.creator) {
            const context = evaluator.getEvaluationContext();
            if(context === undefined) return new ContextException(evaluator, StackSize.EMPTY);
            return new Structure(context);
        }
        // Root blocks are allowed to have no value, but all others must have one.
        else return this.root && !evaluator.hasValue() ? new None() : evaluator.popValue(undefined);

    }

    clone(original?: Node, replacement?: Node) { 
        return new Block(
            this.docs.map(d => d.cloneOrReplace([ Documentation ], original, replacement)), 
            this.statements.map(s => s.cloneOrReplace([ Expression, Unparsable, Share, Bind ], original, replacement)), 
            this.root,
            this.creator, 
            this.open?.cloneOrReplace([ Token, undefined ], original, replacement), 
            this.close?.cloneOrReplace([ Token, undefined], original, replacement)
        ) as this; 
    }

    /** 
     * Blocks don't do any type checks, but we do have them delegate type checks to their final expression.
     * since we use them for parentheticals in boolean logic.
     * */
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 

        if(this.statements.length === 0) return current;
        const last = this.statements[this.statements.length - 1];
        return last instanceof Expression ? last.evaluateTypeSet(bind, original, current, context) : current;

    }

    getDescriptions() {
        return {
            eng: "Evaluate one or more expressions"
        }
    }

    getChildReplacements(child: Node, context: Context, position: Position): Replacement[] {

        const bind = new Bind([], undefined, [ new Alias("") ], undefined, new ExpressionPlaceholder());

        const index = this.statements.indexOf(child as Statement);
        if(index >= 0) {
            const statement = this.statements[index];
            const last = index === this.statements.length - 1;
            if(statement instanceof Expression)
                return [
                    ...(last ? getPossibleExpressions(this, statement, context) : []),
                    bind
                ]
            if(position === Position.BEFORE)
                return [
                    ...(last ? getPossibleExpressions(this, undefined, context) : []),
                    bind
                ]
            
        }
        return [];

    }

}