import Conflict, { UnknownTypeName } from "../parser/Conflict";
import StructureType from "./StructureType";
import type Program from "./Program";
import type Token from "./Token";
import Type from "./Type";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";

export default class NameType extends Type {

    readonly type: Token;

    constructor(type: Token) {
        super();

        this.type = type;
    }

    getChildren() {
        return [ this.type ];
    }

    getConflicts(program: Program): Conflict[] { 
        
        const conflicts = [];

        const type = this.getType(program);
        // The name should be a custom type.
        if(!(type instanceof StructureType))
            conflicts.push(new UnknownTypeName(this));

        return conflicts; 
    
    }

    isCompatible(program: Program, type: Type): boolean {    
        const thisType = this.getType(program);
        return thisType instanceof StructureType && thisType.type === type;
    } 

    getType(program: Program): Type | undefined {

        // The name should be defined.
        const definition = program.getBindingEnclosureOf(this)?.getDefinition(program, this, this.type.text);
        if(definition === undefined) return undefined;
        else if(definition instanceof TypeVariable) return new UnknownType(this);
        else return definition.getType(program);

    }
    
}