import Conflict from "./Conflict";
import CustomTypeType from "./CustomTypeType";
import type Program from "./Program";
import { SemanticConflict } from "./SemanticConflict";
import type { Token } from "./Token";
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
        // The name should be defined.
        if(type === undefined)
            conflicts.push(new Conflict(this, SemanticConflict.UNDEFINED_NAME));
        // The name should be a custom type.
        else if(!(type instanceof CustomTypeType))
            conflicts.push(new Conflict(this, SemanticConflict.NOT_A_TYPE));

        return conflicts; 
    
    }

    isCompatible(program: Program, type: Type): boolean {    
        const thisType = this.getType(program);
        return thisType instanceof CustomTypeType && thisType.type === type;
    } 

    getType(program: Program): Type | undefined {

        // The name should be defined.
        const definition = program.getBindingEnclosureOf(this)?.getDefinition(program, this, this.type.text);
        if(definition === undefined) return undefined;
        else if(definition instanceof TypeVariable) return new UnknownType(this);
        else return definition.getType(program);

    }
    
}