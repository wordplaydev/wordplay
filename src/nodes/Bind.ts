import Expression from "./Expression";
import Node from "./Node";
import type Context from "./Context";
import Alias from "./Alias";
import Token from "./Token";
import Type from "./Type";
import Unparsable from "./Unparsable";
import Documentation from "./Documentation";
import type Conflict from "../conflicts/Conflict";
import { UnusedBind } from "../conflicts/UnusedBind";
import { DuplicateBinds } from "../conflicts/DuplicateBinds";
import { IncompatibleBind } from "../conflicts/IncompatibleBind";
import { UnexpectedEtc } from "../conflicts/UnexpectedEtc";
import UnknownType from "./UnknownType";
import NameType from "./NameType";
import StructureType from "./StructureType";
import StructureDefinition from "./StructureDefinition";
import TypeVariable from "./TypeVariable";
import Name from "./Name";
import Column from "./Column";
import ColumnType from "./ColumnType";
import type Evaluator from "../runtime/Evaluator";
import type Evaluable from "../runtime/Evaluable";
import type Step from "../runtime/Step";
import Action from "../runtime/Start";
import Halt from "../runtime/Halt";
import Finish from "../runtime/Finish";
import Exception, { ExceptionKind } from "../runtime/Exception";
import type { Named } from "./Named";
import { getDuplicateAliases } from "./util";
import Evaluate from "./Evaluate";
import Block from "./Block";

export default class Bind extends Node implements Evaluable, Named {
    
    readonly docs: Documentation[];
    readonly etc: Token | undefined;
    readonly names: Alias[];
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly colon?: Token;
    readonly value?: Expression | Unparsable;

    constructor(docs: Documentation[], etc: Token | undefined, names: Alias[], type?: Type | Unparsable, value?: Expression | Unparsable, dot?: Token, colon?: Token) {
        super();

        this.docs = docs;
        this.etc = etc;
        this.names = names;
        this.dot = dot;
        this.type = type;
        this.colon = colon;
        this.value = value;
    }

    hasName(name: string) { return this.names.find(n => n.getName() === name) !== undefined; }
    sharesName(bind: Bind) { return this.getNames().find(name => bind.hasName(name)) !== undefined; }

    getNames(): string[] { return this.names.map(n => n.getName()).filter(n => n !== undefined) as string[]; }
    getNameTokens(): Token[] { return this.names.map(n => n.name).filter(n => n !== undefined) as Token[]; }

    isVariableLength() { return this.etc !== undefined; }

    hasDefault() { return this.value !== undefined; }

    computeChildren() { 
        let children: Node[] = [];
        children = children.concat(this.docs);
        if(this.etc) children.push(this.etc);
        children = children.concat(this.names);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }

    computeConflicts(context: Context): Conflict[] {

        const conflicts = [];

        // Etc tokens can't appear in block bindings, just structure and function definitions.
        if(this.isVariableLength() && this.getParent() instanceof Block)
            conflicts.push(new UnexpectedEtc(this));

        // Bind aliases have to be unique
        const duplicates = getDuplicateAliases(this.names);
        if(duplicates) conflicts.push(duplicates);

        // If there's a type, the value must match.
        if(this.type instanceof Type && this.value && this.value instanceof Expression) {
            const valueType = this.value.getTypeUnlessCycle(context);
            if(!this.type.isCompatible(valueType, context))
                conflicts.push(new IncompatibleBind(this.type, this.value, valueType));
        }

        const enclosure = this.getBindingEnclosureOf();

        // It can't already be defined.
        const definitions = this.names.map(alias => {
            const name = alias.getName();
            return name === undefined ? undefined : enclosure?.getDefinition(context, this, name);
        }).filter(def => def !== undefined && def !== this) as (Expression | Bind | TypeVariable)[];
        if(definitions.length > 0)
            conflicts.push(new DuplicateBinds(this, definitions));

        // If this bind isn't part of an Evaluate, it should be used in some expression in its parent.
        const parent = this.getParent();
        if(enclosure && !(parent instanceof Column || parent instanceof ColumnType || parent instanceof Evaluate)) {
            const uses = enclosure.nodes(n => n instanceof Name && this.names.find(name => name.getName() === n.name.text.toString()) !== undefined);
            if(uses.length === 0)
                conflicts.push(new UnusedBind(this));
        }

        return conflicts;

    }

    getType(context: Context): Type {

        // What type is this binding?
        let type = 
            // If it's declared, use the declaration.
            this.type instanceof Type ? this.type :
            // If the value is a structure definition, make a structure type.
            this.value instanceof StructureDefinition ? new StructureType(this.value) :
            // If it has an expression. ask the expression.
            this.value instanceof Expression ? this.value.getTypeUnlessCycle(context) :
            // Otherwise, we don't know.
            new UnknownType(this);

        // If the type is a name, and it refers to a structure, resolve it.
        // Leave names that refer to type variables to be resolved in Evaluate.
        if(type instanceof NameType) {
            const nameType = type.getType(context);
            if(nameType instanceof StructureType) return nameType;
        }
        return type;
        
    }

    getTypeUnlessCycle(context: Context): Type {

        // If the context includes this node, we're in a cycle.
        if(context.visited(this)) return new UnknownType(this);

        context.visit(this);
        const type = this.getType(context);
        context.unvisit();
        return type;   

    }

    resolveTypeName(context: Context, name: string) {

        // Find the name, using the binding enclosure, or the program.
        const enclosure = this.getBindingEnclosureOf();
        const definition = enclosure !== undefined ? enclosure.getDefinition(context, this, name) : context.program.getDefinition(context, this, name);
        if(definition === undefined) return new UnknownType(this);
        else if(definition instanceof Bind) return definition.getTypeUnlessCycle(context);
        else if(definition instanceof TypeVariable) return new UnknownType(this);
        else if(definition instanceof StructureDefinition) return new StructureType(definition);
        else return new UnknownType(this);

    }

    compile(context: Context):Step[] {
        return this.value === undefined ?
            [ new Halt(new Exception(this, ExceptionKind.EXPECTED_VALUE), this) ] :
            [ new Action(this), ...this.value.compile(context), new Finish(this) ];
    }

    evaluate(evaluator: Evaluator) {
        
        // Bind the value on the stack to the names.
        this.names.forEach(alias => { 
            const name = alias.getName(); 
            if(name !== undefined) 
                evaluator.bind(name, evaluator.popValue()); 
        });
        return undefined;

    }

    clone(original?: Node, replacement?: Node) { 
        return new Bind(
            this.docs.map(d => d.cloneOrReplace([ Documentation ], original, replacement)), 
            this.etc?.cloneOrReplace([ Token, undefined], original, replacement), 
            this.names.map(n => n.cloneOrReplace([ Alias ], original, replacement)), 
            this.type?.cloneOrReplace([ Type, Unparsable, undefined ], original, replacement), 
            this.value?.cloneOrReplace([ Expression, Unparsable ], original, replacement), 
            this.dot?.cloneOrReplace([ Token, undefined ], original, replacement),
            this.colon?.cloneOrReplace([ Token, undefined ], original, replacement)
        ) as this; 
    }
    
}