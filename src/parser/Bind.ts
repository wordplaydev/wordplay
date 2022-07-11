import Expression from "./Expression";
import Node from "./Node";
import type Alias from "./Alias";
import type { Token } from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";
import type Docs from "./Docs";
import type Program from "./Program";
import Conflict from "./Conflict";
import { SemanticConflict } from "./SemanticConflict";
import UnknownType from "./UnknownType";
import NameType from "./NameType";
import CustomTypeType from "./CustomTypeType";
import CustomType from "./CustomType";

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
            conflicts.push(new Conflict(this, SemanticConflict.BIND_ALIASES_ARENT_UNIQUE))

        // If there's a type, the value must match.
        if(this.type instanceof Type && this.value && this.value instanceof Expression && !this.type.isCompatible(this.value.getType(program)))
            conflicts.push(new Conflict(this, SemanticConflict.INCOMPATIBLE_TYPES))

        // It can't already be defined.
        const definitions = this.names.map(alias => program.getBindingEnclosureOf(this)?.getDefinition(program, this, alias.name.text)).filter(def => def !== undefined);
        if(definitions.length > 0)
            conflicts.push(new Conflict(this, SemanticConflict.ALREADY_BOUND));

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
            const nameType = program.getBindingEnclosureOf(this)?.getDefinition(program, this, type.type.text)?.getType(program);
            return nameType === undefined ? new UnknownType(this) : type;
        }
        else return type;
        
    }

}