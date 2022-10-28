import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import TypeVariable from "./TypeVariable";
import Unparsable from "./Unparsable";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import Block from "./Block";
import FunctionDefinition from "./FunctionDefinition";
import { typeVarsAreUnique, getEvaluationInputConflicts } from "./util";
import ConversionDefinition from "./ConversionDefinition";
import type Evaluator from "../runtime/Evaluator";
import Finish from "../runtime/Finish";
import type Step from "../runtime/Step";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type Context from "./Context";
import type Definition from "./Definition";
import StructureType from "./StructureType";
import Token from "./Token";
import FunctionType from "./FunctionType";
import NameType from "./NameType";
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
import EvalOpenToken from "./EvalOpenToken";
import EvalCloseToken from "./EvalCloseToken";
import Remove from "../transforms/Remove";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import Docs from "./Docs";
import Names from "./Names";

export default class StructureDefinition extends Expression {

    readonly type: Token;
    readonly docs: Docs;
    readonly names: Names;
    readonly interfaces: TypeInput[];
    readonly typeVars: (TypeVariable|Unparsable)[];
    readonly open?: Token;
    readonly inputs: (Bind | Unparsable)[];
    readonly close?: Token;
    readonly block?: Block | Unparsable;

    constructor(
        docs: Docs | Translations | undefined, 
        names: Names | Translations | undefined, 
        interfaces: TypeInput[], 
        typeVars: (TypeVariable|Unparsable)[], 
        inputs: (Bind|Unparsable)[], 
        block?: Block | Unparsable, 
        type?: Token, 
        open?: Token, 
        close?: Token) {

        super();

        this.docs = docs instanceof Docs ? docs : new Docs(docs);
        this.names = names instanceof Names ? names : new Names(names);
        this.type = type ?? new TypeToken();
        this.interfaces = interfaces;
        this.typeVars = typeVars;
        this.open = open === undefined && inputs.length > 0 ? new EvalOpenToken() : open;
        this.inputs = inputs;
        this.close = close == undefined && inputs.length > 0 ?new EvalCloseToken() : close;
        this.block = block;
    }

    clone(pretty: boolean=false, original?: Node | string, replacement?: Node) {
        return new StructureDefinition(
            this.cloneOrReplaceChild(pretty, [ Docs ], "docs", this.docs, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Names ], "names", this.names, original, replacement),
            this.cloneOrReplaceChild(pretty, [ TypeInput ], "interfaces", this.interfaces, original, replacement), 
            this.cloneOrReplaceChild(pretty, [ TypeVariable, Unparsable ], "typeVars", this.typeVars, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Bind, Unparsable ], "inputs", this.inputs, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Block, Unparsable, undefined ], "block", this.block, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token ], "type", this.type, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "open", this.open, original, replacement),
            this.cloneOrReplaceChild(pretty, [ Token, undefined ], "close", this.close, original, replacement)
        ) as this;
    }

    getNames() { return this.names.getNames(); }
    hasName(name: string) { return this.names.hasName(name); }
    getTranslation(lang: LanguageCode[]): string { return this.names.getTranslation(lang); }

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
        let children: Node[] = [ this.docs, this.type, this.names, ...this.interfaces, ...this.typeVars ];
        if(this.open) children.push(this.open);
        children = children.concat(this.inputs);
        if(this.close) children.push(this.close);
        if(this.block) children.push(this.block);
        return children;
    }

    computeConflicts(context: Context): Conflict[] { 
        
        let conflicts: Conflict[] = [];
    
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
        return this.block instanceof Block ? this.block.statements.find(i => (i instanceof StructureDefinition || i instanceof FunctionDefinition) && i.names.names.find(a => a.getName() === name)) as FunctionDefinition | StructureDefinition : undefined;
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

    compile():Step[] {
        return [ new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        const context = evaluator.getEvaluationContext();
        if(context !== undefined) {
            const def = new StructureDefinitionValue(this, context);
            this.names.names.forEach(a => {
                const name = a.getName();
                if(name !== undefined)
                    context.bind(name, def);
            });
            return undefined;
        }
        else
            return new ContextException(evaluator, StackSize.EMPTY);
            
    }
    
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.block instanceof Expression) this.block.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {
        if(this.interfaces.includes(child as TypeInput)) {
            return  this.getAllDefinitions(this, context)
                    .filter((def): def is StructureDefinition => def instanceof StructureDefinition && def.isInterface())
                    .map(def => new Replace<TypeInput>(context.source, child, [ name => new TypeInput(new NameType(name)), def ]));
        }
    }

    getInsertionBefore(child: Node, context: Context, position: number): Transform[] | undefined {
        if(child === this.open) {
            const transforms: Transform[] = [];
            if(this.typeVars.length === 0)
                transforms.push(new Append(context.source, position, this, this.typeVars, child, new TypeInput(new TypePlaceholder())));

            return transforms;
        }
        else if(this.interfaces.includes(child as TypeInput))
            return [ new Append(context.source, position, this, this.interfaces, child, new TypeInput(new TypePlaceholder())) ]
    }

    getInsertionAfter(): Transform[] | undefined { return []; }

    getChildRemoval(child: Node, context: Context): Transform | undefined {
        if( this.typeVars.includes(child as TypeVariable) || 
            this.interfaces.includes(child as TypeInput) || 
            this.inputs.includes(child as Bind | Unparsable))
            return new Remove(context.source, this, child);
        else if(child === this.block) return new Remove(context.source, this, child);
    
    }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }
    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to this structure definition!"
        }
    }

    getDescriptions(): Translations {
        return overrideWithDocs(
            { 
                eng: "a structure",
                "😀": TRANSLATE
            }, 
            this.docs
        );
    }

}