import type Conflict from "../conflicts/Conflict";
import { UnknownTypeName } from "../conflicts/UnknownTypeName";
import Token from "./Token";
import TokenType from "./TokenType";
import Type from "./Type";
import type Node from "./Node";
import TypeVariable from "./TypeVariable";
import UnknownType from "./UnknownType";
import type Context from "./Context";
import Value from "../runtime/Value";
import type Definition from "./Definition";
import StructureDefinition from "./StructureDefinition";
import VariableType from "./VariableType";
import { NAME_NATIVE_TYPE_NAME } from "../native/NativeConstants";

export default class NameType extends Type {

    readonly type: Token;

    constructor(type: Token | string) {
        super();

        this.type = typeof type === "string" ? new Token(type, [ TokenType.NAME ]) : type;
    }

    getName() { return this.type instanceof Token ? this.type.text.toString() : this.type}

    computeChildren() { return [ this.type ]; }

    computeConflicts(context: Context): Conflict[] { 
        
        const conflicts = [];

        const def = this.getDefinition(context);
        // The name should be a structure type or a type variable on a structure that contains this name type.
        if(!(def instanceof StructureDefinition || def instanceof TypeVariable))
            conflicts.push(new UnknownTypeName(this));

        return conflicts; 
    
    }

    isCompatible(type: Type, context: Context): boolean {    
        const thisType = this.getType(context);
        return thisType === undefined ? false : thisType.isCompatible(type, context);
    }

    getDefinition(context: Context): Definition {

        const enclosure = this.getBindingEnclosureOf() ?? context.program;
        return enclosure.getDefinition(context, this, this.getName());

    }

    isTypeVariable(context: Context) { return this.getDefinition(context) instanceof TypeVariable; }

    getType(context: Context): Type {

        // The name should be defined.
        const definition = this.getDefinition(context);
        if(definition === undefined) return new UnknownType(this);
        else if(definition instanceof TypeVariable) return new VariableType(definition);
        else return definition instanceof Value ? definition.getType() : definition.getTypeUnlessCycle(context);

    }

    getNativeTypeName(): string { return NAME_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { return new NameType(this.type.cloneOrReplace([ Token ], original, replacement)) as this; }

}