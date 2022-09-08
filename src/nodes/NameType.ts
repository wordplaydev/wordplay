import type Conflict from "../conflicts/Conflict";
import { UnknownTypeName } from "../conflicts/UnknownTypeName";
import StructureType from "./StructureType";
import Token, { TokenType } from "./Token";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import type { ConflictContext } from "./Node";
import Value from "../runtime/Value";

export default class NameType extends Type {

    readonly type: Token;

    constructor(type: Token | string, dot?: Token) {
        super();

        this.type = typeof type === "string" ? new Token(type, [ TokenType.NAME ]) : type;
    }

    getName() { return this.type instanceof Token ? this.type.text.toString() : this.type}

    computeChildren() { return [ this.type ]; }

    getConflicts(context: ConflictContext): Conflict[] { 
        
        const conflicts = [];

        const type = this.getType(context);
        // The name should be a custom type.
        if(!(type instanceof StructureType))
            conflicts.push(new UnknownTypeName(this));

        return conflicts; 
    
    }

    isCompatible(context: ConflictContext, type: Type): boolean {    
        const thisType = this.getType(context);
        return thisType instanceof StructureType && type instanceof StructureType && thisType.definition === type.definition;
    } 

    getType(context: ConflictContext): Type | undefined {

        // The name should be defined.
        const definition = context.program.getBindingEnclosureOf(this)?.getDefinition(context, this, this.getName());
        if(definition === undefined) return undefined;
        else if(definition instanceof TypeVariable) return new UnknownType(this);
        else return definition instanceof Value ? definition.getType() : definition.getTypeUnlessCycle(context);

    }

    getNativeTypeName(): string { return "structure"; }

}