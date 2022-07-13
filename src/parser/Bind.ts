import Expression from "./Expression";
import Node from "./Node";
import type Alias from "./Alias";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict, { DuplicateBinds, DuplicateAliases, IncompatibleBind, UnusedBind } from "./Conflict";
import UnknownType from "./UnknownType";
import NameType from "./NameType";
import CustomTypeType from "./CustomTypeType";
import CustomType from "./CustomType";
import TypeVariable from "./TypeVariable";
import Name from "./Name";
import Column from "./Column";
import ColumnType from "./ColumnType";

export default class Bind extends Node {
    
    readonly docs: Docs[];
    readonly names: Alias[];
    readonly dot?: Token;
    readonly type?: Type | Unparsable;
    readonly colon?: Token;
    readonly value?: Expression | Unparsable; 

    constructor(docs: Docs[], names: Alias[], dot?: Token, type?: Type | Unparsable, colon?: Token, value?: Expression | Unparsable) {
        super();

        this.docs = docs;
        this.names = names;
        this.dot = dot;
        this.type = type;
        this.colon = colon;
        this.value = value;
    }

    hasName(name: string) { return this.names.find(n => n.name.text === name) !== undefined; }

    getNames() { return this.names.map(n => n.name.text ); }

    getChildren() { 
        let children: Node[] = [];
        children = children.concat(this.docs);
        children = children.concat(this.names);
        if(this.dot) children.push(this.dot);
        if(this.type) children.push(this.type);
        if(this.colon) children.push(this.colon);
        if(this.value) children.push(this.value);
        return children;
    }

    getConflicts(program: Program): Conflict[] {

        const conflicts = [];

        // Bind aliases have to be unique
        if(!this.names.every(n => this.names.find(n2 => n !== n2 && n.name.text === n2.name.text) === undefined))
            conflicts.push(new DuplicateAliases(this))

        // If there's a type, the value must match.
        if(this.type instanceof Type && this.value && this.value instanceof Expression && !this.type.isCompatible(program, this.value.getType(program)))
            conflicts.push(new IncompatibleBind(this.type, this.value));

        const enclosure = program.getBindingEnclosureOf(this);

        // It can't already be defined.
        const definitions = this.names.map(alias => enclosure?.getDefinition(program, this, alias.name.text)).filter(def => def !== undefined) as (Expression | Bind | TypeVariable)[];
        if(definitions.length > 0)
            conflicts.push(new DuplicateBinds(this, definitions));

        // It should be used in some expression in its parent.
        const parent = this.getParent(program);
        if(enclosure && !(parent instanceof Column || parent instanceof ColumnType)) {
            const uses = enclosure.nodes().filter(n => n instanceof Name && this.names.find(name => name.name.text === n.name.text) !== undefined);
            if(uses.length === 0)
                conflicts.push(new UnusedBind(this));
        }

        return conflicts;

    }

    getType(program: Program): Type {

        const type = 
            this.type instanceof Type ? this.type :
            this.value instanceof CustomType ? new CustomTypeType(this.value) :
            this.value instanceof Expression ? this.value.getType(program) :
            new UnknownType(this);

        // Resolve the name 
        if(type instanceof NameType) {
            // Find the name.
            const bindOrTypeVariable = program.getBindingEnclosureOf(this)?.getDefinition(program, this, type.type.text);
            if(bindOrTypeVariable === undefined) return new UnknownType(this);
            else if(bindOrTypeVariable instanceof Bind) return bindOrTypeVariable.getType(program);
            else if(bindOrTypeVariable instanceof TypeVariable) return new UnknownType(this);
            else return new UnknownType(this);
        }
        else return type;
        
    }

}