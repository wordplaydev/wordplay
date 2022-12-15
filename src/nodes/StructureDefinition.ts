import type Node from "./Node";
import Bind from "./Bind";
import Expression from "./Expression";
import type Conflict from "../conflicts/Conflict";
import Type from "./Type";
import Block from "./Block";
import FunctionDefinition from "./FunctionDefinition";
import { getEvaluationInputConflicts } from "./util";
import ConversionDefinition from "./ConversionDefinition";
import type Evaluator from "../runtime/Evaluator";
import type Step from "../runtime/Step";
import StructureDefinitionValue from "../runtime/StructureDefinitionValue";
import type Context from "./Context";
import type Definition from "./Definition";
import StructureType from "./StructureType";
import Token from "./Token";
import FunctionType from "./FunctionType";
import type { TypeSet } from "./UnionType";
import { Unimplemented } from "../conflicts/Unimplemented";
import { Implemented } from "../conflicts/Implemented";
import { DisallowedInputs } from "../conflicts/DisallowedInputs";
import EvaluationException, { StackSize } from "../runtime/ContextException";
import type Transform from "../transforms/Transform"
import type LanguageCode from "./LanguageCode";
import TypeToken from "./TypeToken";
import EvalOpenToken from "./EvalOpenToken";
import EvalCloseToken from "./EvalCloseToken";
import type Translations from "./Translations";
import { overrideWithDocs, TRANSLATE } from "./Translations"
import Docs from "./Docs";
import Names from "./Names";
import type Value from "../runtime/Value";
import StartFinish from "../runtime/StartFinish";
import TypeVariables from "./TypeVariables";
import Reference from "./Reference";

export default class StructureDefinition extends Expression {

    readonly docs: Docs | undefined;
    readonly type: Token;
    readonly names: Names;
    readonly interfaces: Reference[];
    readonly types: TypeVariables | undefined;
    readonly open: Token | undefined;
    readonly inputs: Bind[];
    readonly close: Token | undefined;
    readonly expression?: Block;

    constructor(
        docs: Docs | undefined, 
        type: Token, 
        names: Names, 
        interfaces: Reference[], 
        types: TypeVariables | undefined,
        open: Token | undefined,
        inputs: Bind[], 
        close: Token | undefined,
        block?: Block
    ) {

        super();

        this.docs = docs;
        this.type = type;
        this.names = names;
        this.interfaces = interfaces;
        this.types = types;
        this.open = open;
        this.inputs = inputs;
        this.close = close;
        this.expression = block;

        this.computeChildren();

    }

    static make(docs: Translations | undefined, names: Translations | Names, interfaces: Reference[], types: TypeVariables | undefined, inputs: Bind[], block?: Block) {
        return new StructureDefinition(
            new Docs(docs),
            new TypeToken(),
            names instanceof Names ? names : Names.make(names),
            interfaces,
            types,
            new EvalOpenToken(),
            inputs,
            new EvalCloseToken(),
            block
        );
    }

    getGrammar() { 
        return [
            { name: "docs", types:[ Docs, undefined ] },
            { name: "type", types:[ Token ] },
            { name: "names", types:[ Names ] },
            { name: "interfaces", types:[[ Reference ] ] },
            { name: "types", types:[ TypeVariables, undefined ] },
            { name: "open", types:[ Token, undefined ] },
            { name: "inputs", types:[[ Bind ]] },
            { name: "close", types:[ Token, undefined ] },
            { name: "expression", types:[ Block, undefined ] },
        ];
    }

    replace(original?: Node, replacement?: Node) {
        return new StructureDefinition(
            this.replaceChild("docs", this.docs, original, replacement),
            this.replaceChild("names", this.names, original, replacement),
            this.replaceChild("interfaces", this.interfaces, original, replacement), 
            this.replaceChild("types", this.types, original, replacement),
            this.replaceChild("inputs", this.inputs, original, replacement),
            this.replaceChild("expression", this.expression, original, replacement),
            this.replaceChild("type", this.type, original, replacement),
            this.replaceChild("open", this.open, original, replacement),
            this.replaceChild("close", this.close, original, replacement)
        ) as this;
    }

    getNames() { return this.names.getNames(); }
    hasName(name: string) { return this.names.hasName(name); }
    getTranslation(lang: LanguageCode[]): string { return this.names.getTranslation(lang); }

    isEvaluationInvolved() { return true; }
    isEvaluationRoot() { return true; }
    isBindingEnclosureOfChild(child: Node): boolean { 
        return  child === this.expression || 
                (child instanceof Bind && this.inputs.includes(child)) ||
                this.interfaces.includes(child as Reference); 
    }

    getInputs() { return this.inputs.filter(i => i instanceof Bind) as Bind[]; }

    getFunctionType(): FunctionType {
       return FunctionType.make(this.types, this.inputs, new StructureType(this));
    }

    isInterface(): boolean { return this.getAbstractFunctions().length > 0; }
    getAbstractFunctions(): FunctionDefinition[] { return this.getFunctions(false); }
    getImplementedFunctions(): FunctionDefinition[] { return this.getFunctions(true); }

    implements(def: StructureDefinition, context: Context) {
        return this.interfaces.some(i => i.refersTo(context, def));
    }

    getFunctions(implemented?: boolean): FunctionDefinition[] {

        if(this.expression === undefined) return [];
        return this.expression.statements.map(s => 
            s instanceof FunctionDefinition ? s :
            (s instanceof Bind && s.value instanceof FunctionDefinition) ? s.value :
            undefined
        ).filter(s => s !== undefined && (implemented === undefined || (implemented === true && !s.isAbstract()) || (implemented === false && s.isAbstract()))) as FunctionDefinition[];

    }

    computeConflicts(context: Context): Conflict[] { 
        
        let conflicts: Conflict[] = [];

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
        if(this.interfaces.length > 0 && this.expression instanceof Block) {
            for(const iface of this.interfaces) {
                const definition = iface.getDefinition(context);
                if(definition instanceof StructureDefinition) {
                    const abstractFunctions = definition.getAbstractFunctions();
                    if(abstractFunctions !== undefined)
                        for(const abFun of abstractFunctions) {
                            // Does this structure implement the given abstract function on the interface?
                            if(this.expression.statements.find(statement => statement instanceof FunctionDefinition && abFun.accepts(statement, context)) === undefined)
                                conflicts.push(new Unimplemented(this, definition, abFun));
                        }
                }
            }
        }

        return conflicts;
    
    }

    getDefinition(name: string): Bind | FunctionDefinition | StructureDefinition | undefined {
        
        // Definitions can be inputs...
        const inputBind = this.inputs.find(i => i instanceof Bind && i.hasName(name)) as Bind;
        if(inputBind !== undefined) return inputBind;

        // ...or they can be in a structure's block binds.
        return this.expression !== undefined ? 
            this.expression.statements.find(i => (i instanceof StructureDefinition || i instanceof FunctionDefinition || i instanceof Bind) && i.names.hasName(name)) as FunctionDefinition | StructureDefinition | Bind : undefined;
    }

    getDefinitions(node: Node): Definition[] {
        // Does an input delare the name that isn't the one asking?
        return [
            this,
            ... this.inputs.filter(i => i instanceof Bind && i !== node) as Bind[], 
            ... (this.types ? this.types.variables : []),
            ... (this.expression instanceof Block ? this.expression.statements.filter(s => s instanceof FunctionDefinition || s instanceof StructureDefinition || s instanceof Bind) as Definition[] : [])
        ];
    }

    /**
     * Given an execution context and input and output types, find a conversion function defined on this structure that converts between the two.
     */
    getConversion(context: Context, input: Type, output: Type): ConversionDefinition | undefined {

        // Find the conversion in this type's block that produces a compatible type. 
        return this.expression instanceof Block ? 
            this.expression.statements.find(s => 
                s instanceof ConversionDefinition &&
                s.input instanceof Type && 
                s.output instanceof Type && 
                s.convertsTypeTo(input, output, context)) as ConversionDefinition | undefined :
            undefined;
        
    }

    getAllConversions() {
        return this.expression instanceof Block ? 
            this.expression.statements.filter(s => s instanceof ConversionDefinition) as ConversionDefinition[] :
            [];
    }

    computeType(): Type { return new StructureType(this); }

    getDependencies(): Expression[] {
        return this.expression instanceof Block ? [ this.expression ] : [];
    }

    compile():Step[] {
        return [ new StartFinish(this) ];
    }

    evaluate(evaluator: Evaluator): Value | undefined {
        
        // Bind this definition to it's names.
        const context = evaluator.getCurrentEvaluation();
        if(context !== undefined) {
            const def = new StructureDefinitionValue(this, this, context);
            evaluator.bind(this.names, def);
            return def;
        }
        else
            return new EvaluationException(StackSize.EMPTY, evaluator);
            
    }
    
    evaluateTypeSet(bind: Bind, original: TypeSet, current: TypeSet, context: Context) { 
        if(this.expression instanceof Expression) this.expression.evaluateTypeSet(bind, original, current, context);
        return current;
    }

    getChildReplacement(): Transform[] | undefined { return undefined; }
    getInsertionBefore(): Transform[] | undefined { return undefined; }
    getInsertionAfter(): Transform[] | undefined { return []; }
    getChildRemoval(): Transform | undefined { return undefined; }

    getStart() { return this.type; }
    getFinish() { return this.names; }

    getStartExplanations(): Translations { return this.getFinishExplanations(); }

    getFinishExplanations(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "Evaluate to this structure definition!"
        }
    }

    getDescriptions(): Translations {
        const defaultDocs = { 
            eng: "A structure",
            "😀": TRANSLATE
        };
        return this.docs ? overrideWithDocs(defaultDocs, this.docs) : defaultDocs;
    }

}