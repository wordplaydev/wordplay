import type Node from "./Node";
import Bind from "./Bind";
import type Conflict from "../conflicts/Conflict";
import { ExpectedEndingExpression } from "../conflicts/ExpectedEndingExpression";
import { ExpectedBindValue } from "../conflicts/ExpectedBindValue";
import { IgnoredExpression } from "../conflicts/IgnoredExpression";
import { DuplicateLanguages } from "../conflicts/DuplicateLanguages";
import type Docs from "./Docs";
import Expression from "./Expression";
import Share from "./Share";
import type Token from "./Token";
import type Type from "./Type";
import UnknownType from "./UnknownType";
import Unparsable from "./Unparsable";
import { docsAreUnique } from "./util";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionKind } from "../runtime/Exception";
import Action from "../runtime/Start";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Halt from "../runtime/Halt";
import Structure from "../runtime/Structure";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";
import StructureDefinition from "./StructureDefinition";
import FunctionDefinition from "./FunctionDefinition";

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

    computeChildren() {
        return [ ...this.docs, ...(this.open ? [ this.open ] : []), ...this.statements, ...(this.close ? [ this.close ] : [])];
    }

    computeConflicts(context: ConflictContext): Conflict[] {

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
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {

        const containingStatement = this.statements.find(s => s.contains(node));
        if(containingStatement === undefined) return;
        const index = this.statements.indexOf(containingStatement);
        if(index < 0) return;

        // Do any of the binds, shares, structure, or function definitions declare it?
        const localBind = this.statements.find((s, i)  => 
            // Note that we allow an bind to refer to itself, since bound reactions can refer to themselves.
            i <= index &&
            (
                (s instanceof Bind && s.hasName(name)) ||
                (s instanceof Share && s.bind instanceof Bind && s.bind.hasName(name)) ||
                (s instanceof StructureDefinition && s.hasName(name)) || 
                (s instanceof FunctionDefinition && s.aliases.find(n => n.getName() === name) !== undefined)
            )
        ) as Bind | Share | StructureDefinition | FunctionDefinition;

        // If we found a local bind, return it.
        if(localBind instanceof Share) {
            if(!(localBind.bind instanceof Unparsable)) 
                return localBind.bind;
        }
        else if(localBind !== undefined) return localBind;

        // Is there an enclosing function or block?
        return context.program.getBindingEnclosureOf(this)?.getDefinition(context, node, name);
        
    }
 
    computeType(context: ConflictContext): Type {
        // The type of the last expression.
        const lastExpression = this.statements.slice().reverse().find(s => s instanceof Expression) as Expression | undefined;
        return lastExpression === undefined ? new UnknownType(this) : lastExpression.getTypeUnlessCycle(context);
    }

    compile(context: ConflictContext):Step[] {

        // If there are no statements, halt on exception.
        return !this.creator && this.statements.length === 0 ? 
            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_EXPRESSION), this) ] :
            [ 
                new Action(this), 
                ...this.statements.reduce((prev: Step[], current) => [ ...prev, ...current.compile(context) ], []),
                new Finish(this) 
            ];

    }

    evaluate(evaluator: Evaluator) {

        // If this block is creating a structure, take the context and bindings we just created
        // and convert it into a structure.
        if(this.creator) {
            const context = evaluator.getEvaluationContext();
            if(context === undefined) return new Exception(this, ExceptionKind.EXPECTED_CONTEXT);
            return new Structure(context);
        }
        // If this block is just an expression, return the (last) value on the value stack of the current evaluation context.
        else return evaluator.popValue();            

    }

}