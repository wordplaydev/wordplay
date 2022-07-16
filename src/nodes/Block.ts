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
import type { Evaluable } from "../runtime/Evaluation";
import type Evaluator from "../runtime/Evaluator";
import type Value from "../runtime/Value";
import Exception, { ExceptionType } from "../runtime/Exception";

export default class Block extends Expression {

    readonly open?: Token | Unparsable;
    readonly statements: (Expression | Unparsable | Share | Bind)[];
    readonly close?: Token | Unparsable;
    readonly docs: Docs[];

    constructor(docs: Docs[], statements: (Expression | Unparsable | Share | Bind)[], open?: Token | Unparsable, close?: Token | Unparsable) {
        super();

        this.open = open;
        this.statements = statements.slice();
        this.close = close;
        this.docs = docs;
    }

    isBindingEnclosureOfChild(child: Node): boolean { return true; }

    isBindingEnclosure() { return true; }

    getChildren() {
        return [ ...this.docs, ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }

    getConflicts(program: Program): Conflict[] {

        const conflicts = [];

        // Blocks can't be empty. And if they aren't empty, the last statement must be an expression.
        if(this.statements.length === 0 || !(this.statements[this.statements.length  - 1] instanceof Expression))
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

    evaluate(evaluator: Evaluator): Value | Evaluable {

        // If there are no statements, return an exception.
        if(this.statements.length === 0) return new Exception(ExceptionType.NO_BLOCK_EXPRESSION);

        // If not, what was last evaluated?
        const lastEvaluated = evaluator.lastEvaluated();

        // Find it in the list of statements.
        const index = lastEvaluated === undefined ? -1 : this.statements.indexOf(lastEvaluated);

        // If we haven't executed the first statement yet, start it.
        if(index < 0) return this.statements[0];
        // If we have, execute the statement after it if there is one.
        else if(index < this.statements.length - 1) return this.statements[index + 1];
        // If we're at the end of the last, return the last value computed.
        else return evaluator.popValue();

    }

}