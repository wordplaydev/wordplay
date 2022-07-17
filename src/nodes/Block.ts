import type Node from "./Node";
import Bind from "./Bind";
import Conflict, { DuplicateLanguages, ExpectedBindValue, ExpectedEndingExpression, IgnoredExpression } from "../parser/Conflict";
import type Docs from "./Docs";
import Expression from "./Expression";
import type Program from "./Program";
import Share from "./Share";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import type Unparsable from "./Unparsable";
import { docsAreUnique } from "./util";
import type TypeVariable from "./TypeVariable";
import type Evaluable from "../runtime/Evaluable";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionType } from "../runtime/Exception";
import Start from "../runtime/Start";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import Structure from "../runtime/Structure";

export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly statements: (Expression | Unparsable | Share | Bind)[];
    readonly close?: Token | Unparsable;
    readonly docs: Docs[];
    readonly creator: boolean;

    constructor(docs: Docs[], statements: (Expression | Unparsable | Share | Bind)[], creator: boolean, open?: Token | Unparsable, close?: Token | Unparsable) {
        super();

        this.open = open;
        this.statements = statements.slice();
        this.close = close;
        this.docs = docs;
        this.creator = creator;
    }

    isBindingEnclosureOfChild(child: Node): boolean { return true; }

    isBindingEnclosure() { return true; }

    getChildren() {
        return [ ...this.docs, ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }

    getConflicts(program: Program): Conflict[] {

        const conflicts = [];

        // Blocks can't be empty. And if they aren't empty, the last statement must be an expression.
        if(!this.creator && (this.statements.length === 0 || !(this.statements[this.statements.length  - 1] instanceof Expression)))
            conflicts.push(new ExpectedEndingExpression(this));

        // The only expression allowed is the last one.
        this.statements
            .slice(0, this.statements.length - 1)
            .filter(s => s instanceof Expression)
            .forEach(s => conflicts.push(new IgnoredExpression(s as Expression)));

        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new DuplicateLanguages(this.docs));

        // All binds must have values.
        this.statements.forEach(s => {
            if(s instanceof Bind && s.value === undefined)
                conflicts.push(new ExpectedBindValue(s));
        });

        return conflicts;
        
    }

    /** Given the index in this block and the given name, binds the bind that declares it, if there is one. */
    getDefinition(program: Program, node: Node, name: string): Bind | TypeVariable | Expression | undefined {

        const containingStatement = this.statements.find(s => s.contains(node));
        if(containingStatement === undefined) return;
        const index = this.statements.indexOf(containingStatement);
        if(index < 0) return;

        // Do any of the binds declare it?
        const localBind = this.statements.find((s, i)  => 
            (s instanceof Bind && i < index && s.names.find(n => n.name.text == name) !== undefined) ||
            (s instanceof Share && i < index && s.bind instanceof Bind && s.bind.names.find(n => n.name.text == name) !== undefined)
        ) as Bind;
        if(localBind !== undefined) return localBind;

        // Is there an enclosing function or block?
        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);
        
    }
 
    getType(program: Program): Type {
        // The type of the last expression.
        const lastExpression = this.statements.slice().reverse().find(s => s instanceof Expression) as Expression | undefined;
        return lastExpression === undefined ? new UnknownType(this) : lastExpression.getType(program);
    }

    compile(): Step[] {

        // If there are no statements, halt on exception.
        return !this.creator && this.statements.length === 0 ? 
            [ new Halt(new Exception(ExceptionType.NO_BLOCK_EXPRESSION), this) ] :
            [ 
                new Start(this), 
                ...this.statements.reduce((prev: Step[], current) => [ ...prev, ...current.compile() ], []),
                new Finish(this) 
            ];

    }

    evaluate(evaluator: Evaluator) {

        // If this block is creating a structure, take the context and bindings we just created
        // and convert it into a structure.
        if(this.creator) {
            const context = evaluator.getEvaluationContext();
            if(context === undefined) return new Exception(ExceptionType.EXPECTED_CONTEXT);
            return new Structure(context);
        }
        // If this block is just an expression, return the (last) value on the value stack of the current evaluation context.
        else return evaluator.popValue();            

    }

}