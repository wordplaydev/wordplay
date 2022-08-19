import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Conflict from "../conflicts/Conflict";
import { DuplicateLanguages } from "../conflicts/DuplicateLanguages";
import { VariableLengthArgumentMustBeLast } from "../conflicts/VariableLengthArgumentMustBeLast";
import { RequiredAfterOptional } from "../conflicts/RequiredAfterOptional";
import { DuplicateTypeVariables } from "../conflicts/DuplicateTypeVariables";
import { DuplicateInputNames } from "../conflicts/DuplicateInputNames";
import Type from "./Type";
import Block from "./Block";
import FunctionDefinition from "./FunctionDefinition";
import { docsAreUnique, inputsAreUnique, requiredBindAfterOptional, typeVarsAreUnique } from "./util";
import ConversionDefinition from "./ConversionDefinition";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import Exception, { ExceptionKind } from "../runtime/Exception";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type StructureDefinitionInterface from "../native/StructureDefinitionInterface";
import type { ConflictContext } from "./Node";
import type Definition from "./Definition";
import StructureType from "./StructureType";
import type Alias from "./Alias";
import type Token from "./Token";
import UnknownType from "./UnknownType";
import FunctionType from "./FunctionType";

export default class StructureDefinition extends Expression implements StructureDefinitionInterface {

    readonly docs: Docs[];    
    readonly type?: Token;
    readonly aliases: Alias[];
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open?: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close?: Token;
    readonly block: Block | Unparsable;

    constructor(docs: Docs[], aliases: Alias[], typeVars: (TypeVariable|Unparsable)[], inputs: (Bind|Unparsable)[], block?: Block | Unparsable, type?: Token, open?: Token, close?: Token) {

        super();

        this.docs = docs;
        this.type = type;
        this.aliases = aliases;
        this.typeVars = typeVars;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.block = block ?? new Block([], [], true);
    }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.block; }

    isBindingEnclosure() { return true; }

    getInputs() { return this.inputs.filter(i => i instanceof Bind) as Bind[]; }

    getFunctionType(context: ConflictContext): FunctionType {

        // The type is equivalent to the signature.
        const inputTypes = this.inputs.map(i =>
            i instanceof Bind ?
               {
                   aliases: i.names,
                   type: i.getType(context),
                   required: !(i.hasDefault() || i.isVariableLength()),
                   rest: i.isVariableLength(),
                   default: i.value
               }
               :
               {
                   aliases: [],
                   type: new UnknownType(context.program),
                   required: true,
                   rest: false,
                   default: undefined
               }            
       );
       return new FunctionType(inputTypes, new StructureType(this));

    }

    isInterface(): boolean {
        if(this.block instanceof Unparsable || this.block === undefined) return false;
        const binds = this.block.statements.filter(s => s instanceof Bind) as Bind[];
        return !binds.every(b => !(b.value instanceof FunctionDefinition) || b.value.expression instanceof Expression);
    }

    getChildren() {
        let children: Node[] = [ ...this.docs, ...this.aliases ];
        children = children.concat(this.typeVars);
        if(this.open) children.push(this.open);
        children = children.concat(this.inputs);
        if(this.close) children.push(this.close);
        if(this.block) children.push(this.block);
        return children;
    }

    getConflicts(context: ConflictContext): Conflict[] { 
        
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
    
        // Rest arguments must be list
        const rest = this.inputs.find(i => i instanceof Bind && i.isVariableLength());
        if(rest !== undefined && this.inputs.indexOf(rest) !== this.inputs.length - 1)
            conflicts.push(new VariableLengthArgumentMustBeLast(this));

        return conflicts; 
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(context: ConflictContext, node: Node, name: string): Definition {

        // Is this it? Return it.
        if(this.aliases.find(a => a.getName() === name)) return this;

        // Does an input delare the name?
        const input = this.getBind(name);
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return context.program.getBindingEnclosureOf(this)?.getDefinition(context, node, name);

    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {

        // Find the conversion in this type's block that produces a compatible type. 
        return this.block instanceof Block ? 
            this.block.statements.find(s => s instanceof ConversionDefinition && s.output instanceof Type && s.output.isCompatible(context, type)) as ConversionDefinition | undefined :
            undefined;
        
    }

    getBind(name: string): Bind | undefined {
        return this.inputs.find(i => i instanceof Bind && i.names.find(n => n.getName() === name)) as Bind | undefined;
    }

    getType(context: ConflictContext): Type { return new StructureType(this); }

    isCompatible(context: ConflictContext, type: Type): boolean { return type instanceof StructureType && type.definition === this; }

    hasName(name: string) { return this.aliases.find(a => a.getName() === name) !== undefined; }

    compile(context: ConflictContext):Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        const context = evaluator.getEvaluationContext();
        if(context !== undefined) {
            const def = new StructureDefinitionValue(this, context);
            this.aliases.forEach(a => context.bind(a.getName(), def));
            return undefined;
        }
        else
            return new Exception(this, ExceptionKind.EXPECTED_CONTEXT);
            
    }

}