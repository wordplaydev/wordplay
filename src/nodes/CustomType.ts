import type Node from "./Node";
import Bind from "../nodes/Bind";
import Expression from "./Expression";
import type Token from "./Token";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict, { DuplicateLanguages, DuplicateInputNames, DuplicateTypeVariables, RequiredAfterOptional } from "../parser/Conflict";
import Type from "./Type";
import Block from "../nodes/Block";
import FunctionDefinition from "./FunctionDefinition";
import { docsAreUnique, inputsAreUnique, requiredBindAfterOptional, typeVarsAreUnique } from "./util";
import Conversion from "./Conversion";
import type Evaluator from "../runtime/Evaluator";
import Exception, { ExceptionType } from "../runtime/Exception";
import type Value from "../runtime/Value";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";

export default class CustomType extends Expression {

    readonly docs: Docs[];
    readonly type: Token;
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close: Token;
    readonly block: Block | Unparsable;

    constructor(docs: Docs[], type: Token, typeVars: (TypeVariable|Unparsable)[], open: Token, inputs: (Bind|Unparsable)[], close: Token, block: Block | Unparsable) {

        super();

        this.docs = docs;
        this.type = type;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.block = block;
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.block; }

    isBindingEnclosure() { return true; }

    isInterface() {
        if(this.block instanceof Unparsable) return false;
        const binds = this.block.statements.filter(s => s instanceof Bind) as Bind[];
        return !binds.every(b => !(b.value instanceof FunctionDefinition) || b.value.expression instanceof Expression);
    }

    getChildren() {
        let children: Node[] = [ ...this.docs, this.type ];
        children = children.concat(this.typeVars);
        children = children.concat([ this.open, ...this.inputs, this.close, this.block ]);
        return children;
    }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts: Conflict[] = [];
    
        // Docs must be unique.
        if(!docsAreUnique(this.docs))
            conflicts.push(new DuplicateLanguages(this.docs))
    
        // Inputs must have unique names
        if(!inputsAreUnique(this.inputs))
            conflicts.push(new DuplicateInputNames(this))

        // Type variables must have unique names
        if(!typeVarsAreUnique(this.typeVars))
            conflicts.push(new DuplicateTypeVariables(this));

        // No required binds after optionals.
        const binds = this.inputs.filter(i => i instanceof Bind) as Bind[];
        if(this.inputs.length === binds.length && requiredBindAfterOptional(binds) !== undefined)
            conflicts.push(new RequiredAfterOptional(this));
    

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(program: Program, node: Node, name: string): Bind | TypeVariable | Expression | undefined {

        // Does an input delare the name?
        const input = this.getBind(name);
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return program.getBindingEnclosureOf(this)?.getDefinition(program, node, name);

    }

    getConversion(program: Program, type: Type): Conversion | undefined {

        // Find the conversion in this type's block that produces a compatible type. 
        return this.block instanceof Block ? 
            this.block.statements.find(s => s instanceof Conversion && s.output instanceof Type && s.output.isCompatible(program, type)) as Conversion | undefined :
            undefined;
        
    }

    getBind(name: string): Bind | undefined {
        return this.inputs.find(i => i instanceof Bind && i.names.find(n => n.name.text === name)) as Bind | undefined;
    }

    getType(program: Program): Type { return this; }

    isCompatible(program: Program, type: Type): boolean { return type === this; }

    compile(): Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator): Value | Node {
        return new Exception(ExceptionType.NOT_IMPLEMENTED);
    }

}