import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import Block from "./Block";
import FunctionDefinition from "./FunctionDefinition";
import { getDuplicateDocs, getDuplicateAliases, typeVarsAreUnique, getEvaluationInputConflicts } from "./util";
import ConversionDefinition from "./ConversionDefinition";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type Context from "./Context";
import type Definition from "./Definition";
import StructureType from "./StructureType";
import Alias from "./Alias";
import Token from "./Token";
import TokenType from "./TokenType";
import FunctionType from "./FunctionType";
import NameType from "./NameType";
import { EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL, TYPE_SYMBOL } from "../parser/Tokenizer";
import type TypeInput from "./TypeInput";
import type { TypeSet } from "./UnionType";
import { Unimplemented } from "../conflicts/Unimplemented";
import { Implemented } from "../conflicts/Implemented";
import { DisallowedInputs } from "../conflicts/DisallowedInputs";
import ContextException, { StackSize } from "../runtime/ContextException";

export default class StructureDefinition extends Expression {

    readonly type: Token;
    readonly docs: Documentation[];
    readonly aliases: Alias[];
    readonly interfaces: TypeInput[];
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close: Token;
    readonly block: Block | Unparsable;

    constructor(
        docs: Documentation[], 
        aliases: Alias[], 
        interfaces: TypeInput[], 
        typeVars: (TypeVariable|Unparsable)[], 
        inputs: (Bind|Unparsable)[], 
        block?: Block | Unparsable, 
        type?: Token, 
        open?: Token, 
        close?: Token) {

        super();

        this.docs = docs;
        this.type = type ?? new Token(TYPE_SYMBOL, [ TokenType.TYPE ]);
        this.aliases = aliases;
        this.interfaces = interfaces;
        this.typeVars = typeVars;
        this.open = open ?? new Token(EVAL_OPEN_SYMBOL, [ TokenType.EVAL_OPEN ]);
        this.inputs = inputs;
        this.close = close ?? new Token(EVAL_CLOSE_SYMBOL, [ TokenType.EVAL_CLOSE ]);
        this.block = block ?? new Block([], [], false, true);
    }

    getNames() { return this.aliases.map(a => a.getName()); }

    isBindingEnclosureOfChild(child: Node): boolean { return child === this.block || (child instanceof Bind && this.inputs.includes(child)); }

    getInputs() { return this.inputs.filter(i => i instanceof Bind) as Bind[]; }

    getFunctionType(): FunctionType {
       return new FunctionType(this.inputs, new StructureType(this));
    }

    isInterface(): boolean { return this.getAbstractFunctions().length > 0; }
    getAbstractFunctions(): FunctionDefinition[] { return this.getFunctions(false); }
    getImplementedFunctions(): FunctionDefinition[] { return this.getFunctions(true); }

    getFunctions(implemented?: boolean): FunctionDefinition[] {

        if(this.block instanceof Unparsable || this.block === undefined) return [];
        return this.block.statements.map(s => 
            s instanceof FunctionDefinition ? s :
            (s instanceof Bind && s.value instanceof FunctionDefinition) ? s.value :
            undefined
        ).filter(s => s !== undefined && (implemented === undefined || (implemented === true && !s.isAbstract()) || (implemented === false && s.isAbstract()))) as FunctionDefinition[];

    }

    computeChildren() {
        let children: Node[] = [ this.type, ...this.docs, ...this.aliases, ...this.interfaces, ...this.typeVars ];
        if(this.open) children.push(this.open);
        children = children.concat(this.inputs);
        if(this.close) children.push(this.close);
        if(this.block) children.push(this.block);
        return children;
    }

    computeConflicts(context: Context): Conflict[] { 
        
        let conflicts: Conflict[] = [];
    
        // Docs must be unique.
        const duplicateDocs = getDuplicateDocs(this.docs);
        if(duplicateDocs) conflicts.push(duplicateDocs);
    
        // Structure names must be unique
        const duplicateNames = getDuplicateAliases(this.aliases);
        if(duplicateNames) conflicts.push(duplicateNames);

        // Type variables must have unique names
        const duplicateTypeVars = typeVarsAreUnique(this.typeVars);
        if(duplicateTypeVars) conflicts.push(duplicateTypeVars);

        // Inputs must be valid.
        conflicts = conflicts.concat(getEvaluationInputConflicts(this.inputs));

        // If the structure has unimplemented functions, it can't have any implemented functions.
        if(this.isInterface()) {
            const implemented = this.getImplementedFunctions();
            if(implemented.length > 0)
                conflicts.push(new Implemented(this, implemented));
            if(this.inputs.length > 0)
                conflicts.push(new DisallowedInputs(this));
        }

        // If the structure specifies one or more interfaces, it must implement them.
        if(this.interfaces.length > 0 && this.block instanceof Block) {
            for(const iface of this.interfaces) {
                if(iface.type instanceof NameType) {
                    const definition = iface.type.resolve(context);
                    if(definition instanceof StructureDefinition) {
                        const abstractFunctions = definition.getAbstractFunctions();
                        if(abstractFunctions !== undefined)
                            for(const abFun of abstractFunctions) {
                                // Does this structure implement the given abstract function on the interface?
                                if(this.block.statements.find(statement => statement instanceof FunctionDefinition && statement.matches(abFun, context)) === undefined)
                                    conflicts.push(new Unimplemented(this, definition, abFun));
                            }
                    }
                }
            }
        }

        return conflicts;
    
    }

    /** Given a program that contains this and a name, returns the bind that declares it, if there is one. */
    getDefinition(name: string, context: Context, node: Node): Definition {

        // Is this it? Return it.
        if(this.aliases.find(a => a.getName() === name)) return this;

        // Does an input delare the name?
        const input = this.getBind(name);
        if(input !== undefined) return input;

        // Is it a type variable?
        const typeVar = this.typeVars.find(t => t instanceof TypeVariable && t.name.text.toString() === name) as TypeVariable | undefined;
        if(typeVar !== undefined) return typeVar;

        // If not, does the function nearest function or block declare the name?
        return this.getBindingEnclosureOf()?.getDefinition(name, context, node);

    }

    getConversion(context: Context, input: Type, output: Type): ConversionDefinition | undefined {

        // Find the conversion in this type's block that produces a compatible type. 
        return this.block instanceof Block ? 
            this.block.statements.find(s => 
                s instanceof ConversionDefinition &&
                s.input instanceof Type && 
                s.output instanceof Type && 
                s.convertsType(input, output, context)) as ConversionDefinition | undefined :
            undefined;
        
    }

    getBind(name: string): Bind | FunctionDefinition | undefined {
        const inputBind = this.inputs.find(i => i instanceof Bind && i.hasName(name)) as Bind;
        if(inputBind !== undefined) return inputBind;
        return this.block instanceof Block ? this.block.statements.find(i => i instanceof FunctionDefinition && i.aliases.find(a => a.getName() === name)) as FunctionDefinition: undefined;
    }

    computeType(): Type { return new StructureType(this); }

    isCompatible(type: Type): boolean { return type instanceof StructureType && type.definition === this; }

    hasName(name: string) { return this.aliases.find(a => a.getName() === name) !== undefined; }

    compile():Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        const context = evaluator.getEvaluationContext();
        if(context !== undefined) {
            const def = new StructureDefinitionValue(this, context);
            this.aliases.forEach(a => {
                const name = a.getName();
                if(name !== undefined)
                    context.bind(name, def);
            });
            return undefined;
        }
        else
            return new ContextException(evaluator, StackSize.EMPTY);
            
    }
    
    getStartExplanations() { return this.getFinishExplanations(); }
    getFinishExplanations() {
        return {
            "eng": "Evaluate to this structure definition!"
        }
    }

    clone(original?: Node, replacement?: Node) {
        return new StructureDefinition(
            this.docs.map(d => d.cloneOrReplace([ Documentation ], original, replacement)),
            this.aliases.map(a => a.cloneOrReplace([ Alias ], original, replacement)),
            this.interfaces.map(i => i.cloneOrReplace([ NameType ], original, replacement)), 
            this.typeVars.map(t => t.cloneOrReplace([ TypeVariable, Unparsable ], original, replacement)),
            this.inputs.map(i => i.cloneOrReplace([ Bind, Unparsable ], original, replacement)),
            this.block.cloneOrReplace([ Block ], original, replacement),
            this.type.cloneOrReplace([ Token ], original, replacement),
            this.open.cloneOrReplace([ Token ], original, replacement),
            this.close.cloneOrReplace([ Token ], original, replacement)
        ) as this;
    }

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.block instanceof Expression) this.block.evaluateTypeSet(bind, original, current, context);
        return current;
    }

}