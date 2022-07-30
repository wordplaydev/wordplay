import Conflict, { UnknownTypeName } from "../parser/Conflict";
import StructureType from "./StructureType";
import type Token from "./Token";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import type { ConflictContext } from "./Node";

export default class NameType extends Type {

    readonly type: Token;

    constructor(type: Token) {
        super();

        this.type = type;
    }

    getChildren() {
        return [ this.type ];
    }

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
        return thisType instanceof StructureType && thisType.type === type;
    } 

    getType(context: ConflictContext): Type | undefined {

        // The name should be defined.
        const definition = context.program.getBindingEnclosureOf(this)?.getDefinition(context, this, this.type.text);
        if(definition === undefined) return undefined;
        else if(definition instanceof TypeVariable) return new UnknownType(this);
        else return definition.getType(context);

    }
    
}