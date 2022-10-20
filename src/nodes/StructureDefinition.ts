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
import { ALIAS_SYMBOL, EVAL_CLOSE_SYMBOL, EVAL_OPEN_SYMBOL, PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";
import TypeInput from "./TypeInput";
import type { TypeSet } from "./UnionType";
import { Unimplemented } from "../conflicts/Unimplemented";
import { Implemented } from "../conflicts/Implemented";
import { DisallowedInputs } from "../conflicts/DisallowedInputs";
import ContextException, { StackSize } from "../runtime/ContextException";
import type Transform from "../transforms/Transform"
import TypePlaceholder from "./TypePlaceholder";
import type LanguageCode from "./LanguageCode";
import Append from "../transforms/Append";
import Replace from "../transforms/Replace";
import TypeToken from "./TypeToken";

export default class StructureDefinition extends Expression {

    readonly type: Token;
    readonly docs: Documentation[];
    readonly aliases: Alias[];
    readonly interfaces: TypeInput[];
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open?: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close?: Token;
    readonly block?: Block | Unparsable;

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
        this.type = type ?? new TypeToken();
        this.aliases = aliases;
        this.interfaces = interfaces;
        this.typeVars = typeVars;
        this.open = open === undefined && inputs.length > 0 ? new Token(EVAL_OPEN_SYMBOL, TokenType.EVAL_OPEN) : open;
        this.inputs = inputs;
        this.close = close == undefined && inputs.length > 0 ?new Token(EVAL_CLOSE_SYMBOL, TokenType.EVAL_CLOSE) : close;
        this.block = block;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) {
        return new StructureDefinition(
            this.cloneOrReplaceChild(pretty, [ Documentation ], "docs", this.docs, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Alias ], "aliases", this.aliases, original, replacement),
            this.cloneOrReplaceChild(pretty, [ TypeInput ], "interfaces", this.interfaces, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ TypeVariable, Unparsable ], "typeVars", this.typeVars, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "inputs", this.inputs, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Block, Unparsable ], "block", this.block, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "type", this.type, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "open", this.open, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "close", this.close, original, replacement)
        ) as this;
    }

    getNames() { return this.aliases.map(a => a.getName()).filter(n => n !== undefined) as string[]; }
    getNameInLanguage(lang: LanguageCode) { return this.aliases.find(name => name.isLanguage(lang))?.getName() ?? this.aliases[0]?.getName(); }

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

    getDefinition(name: string): Definition | undefined {
        const inputBind = this.inputs.find(i => i instanceof Bind && i.hasName(name)) as Bind;
        if(inputBind !== undefined) return inputBind;
        return this.block instanceof Block ? this.block.statements.find(i => (i instanceof StructureDefinition || i instanceof FunctionDefinition) && i.aliases.find(a => a.getName() === name)) as FunctionDefinition | StructureDefinition : undefined;
    }

    getDefinitions(node: Node): Definition[] {
        // Does an input delare the name that isn't the one asking?
        return [
            this,
            ... this.inputs.filter(i => i instanceof Bind && i !== node) as Bind[], 
            ... this.typeVars.filter(t => t instanceof TypeVariable) as TypeVariable[],
            ... (this.block instanceof Block ? this.block.statements.filter(s => s instanceof FunctionDefinition || s instanceof StructureDefinition) as Definition[] : [])
        ];
    }

    /**
     * Given an execution context and input and output types, find a conversion function defined on this structure that converts between the two.
     */
    getConversion(context: Context, input: Type, output: Type): ConversionDefinition | undefined {

        // Find the conversion in this type's block that produces a compatible type. 
        return this.block instanceof Block ? 
            this.block.statements.find(s => 
                s instanceof ConversionDefinition &&
                s.input instanceof Type && 
                s.output instanceof Type && 
                s.convertsTypeTo(input, output, context)) as ConversionDefinition | undefined :
            undefined;
        
    }

    getAllConversions() {
        return this.block instanceof Block ? 
            this.block.statements.filter(s => s instanceof ConversionDefinition) as ConversionDefinition[] :
            [];
    }

    computeType(): Type { return new StructureType(this); }

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

    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.block instanceof Expression) this.block.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getDescriptions() {
        
        // Generate documentation by language.
        const descriptions: Record<LanguageCode, string> = { eng: "A type" };
        for(const doc of this.docs) {
            if(doc.lang !== undefined)
                descriptions[doc.lang.getLanguage() as LanguageCode] = doc.docs.getText();
        }
        return descriptions;

    }

    getReplacementChild(child: Node, context: Context): Transform[] | undefined {
        if(this.interfaces.includes(child as TypeInput)) {
            return  this.getAllDefinitions(this, context)
                    .filter((def): def is StructureDefinition => def instanceof StructureDefinition && def.isInterface())
                    .map(def => new Replace<TypeInput>(context.source, child, [ name => new TypeInput(new NameType(name)), def ]));
        }
    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
        if(child === this.open) {
            const transforms: Transform[] = [];
            if((this.interfaces.length === 0 && this.typeVars.length === 0) ||
                (this.interfaces.length > 0 && child === this.interfaces[0]) ||
                (this.interfaces.length === 0 && this.typeVars.length > 0 && this.typeVars[0] === child))
                transforms.push(new Append(context.source, position, this, this.aliases, child, new Alias(PLACEHOLDER_SYMBOL, undefined, new Token(ALIAS_SYMBOL, TokenType.ALIAS))));

            if(this.typeVars.length === 0)
                transforms.push(new Append(context.source, position, this, this.typeVars, child, new TypeInput(new TypePlaceholder())));

            return transforms;
        }
        else if(this.interfaces.includes(child as TypeInput))
            return [ new Append(context.source, position, this, this.interfaces, child, new TypeInput(new TypePlaceholder())) ]
        else if(child === this.close || this.inputs.includes(child as Bind))
            return [ new Append(context.source, position, this, this.inputs, child, new Bind([], undefined, [ new Alias(PLACEHOLDER_SYMBOL) ])) ];
    }
    
    getInsertionAfter() { return undefined; }

}