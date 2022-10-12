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

        const def = this.resolve(context);
        // The name should be a structure type or a type variable on a structure that contains this name type.
        if(!(def instanceof StructureDefinition || def instanceof TypeVariable))
            conflicts.push(new UnknownTypeName(this));

        return conflicts; 
    
    }

    accepts(type: Type, context: Context): boolean {    
        const thisType = this.getType(context);
        return thisType === undefined ? false : thisType.accepts(type, context);
    }

    resolve(context: Context): Definition | undefined {

        const enclosure = this.getBindingEnclosureOf() ?? context.program;
        return enclosure.getDefinitionOfName(this.getName(), context, this);

    }

    isTypeVariable(context: Context) { return this.resolve(context) instanceof TypeVariable; }

    getType(context: Context): Type {

        // The name should be defined.
        const definition = this.resolve(context);
        if(definition === undefined) return new UnknownType(this);
        else if(definition instanceof TypeVariable) return new VariableType(definition);
        else return definition instanceof Value ? definition.getType(context) : definition.getTypeUnlessCycle(context);

    }

    getNativeTypeName(): string { return NAME_NATIVE_TYPE_NAME; }

    clone(original?: Node, replacement?: Node) { return new NameType(this.type.cloneOrReplace([ Token ], original, replacement)) as this; }

    getDescriptions() {
        return {
            eng: "A structure type"
        }
    }

    getChildReplacements(child: Node, context: Context): Node[] {

        const definition = this.resolve(context);
        if(child === this.type)
            return (this.getDefinitions(this, context)
                    .filter(def => def instanceof StructureDefinition && def !== definition) as StructureDefinition[])
                    .reduce((names: string[], def: StructureDefinition) => [... names, ...def.getNames() ], [])
                    .map(name => new Token(name, [ TokenType.NAME ]))
        else return [];

    }

}