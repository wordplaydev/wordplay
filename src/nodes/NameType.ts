import type Conflict from "../conflicts/Conflict";
import { UnknownTypeName } from "../conflicts/UnknownTypeName";
import Token from "./Token";
import Type from "./Type";
import type Node from "./Node";
import TypeVariable from "./TypeVariable";
import type Context from "./Context";
import Value from "../runtime/Value";
import type Definition from "./Definition";
import StructureDefinition from "./StructureDefinition";
import VariableType from "./VariableType";
import NameToken from "./NameToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import TypeInputs from "./TypeInputs";
import InvalidTypeInput from "../conflicts/InvalidTypeInput";
import type TypeSet from "./TypeSet";
import type { NativeTypeName } from "../native/NativeConstants";
import UnknownNameType from "./UnknownNameType";

export default class NameType extends Type {

    readonly name: Token;
    readonly types: TypeInputs | undefined;

    constructor(type: Token | string, types?: TypeInputs) {
        super();

        this.name = typeof type === "string" ? new NameToken(type) : type;
        this.types = types;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "name", types: [ Token ] },
            { name: "types", types: [ TypeInputs ] },
        ];
    }

    replace(original?: Node, replacement?: Node) { 
        return new NameType(
            this.replaceChild("name", this.name, original, replacement),
            this.replaceChild("types", this.types, original, replacement)
        ) as this;
    }

    getName() { return this.name.getText(); }

    computeConflicts(context: Context): Conflict[] { 
        
        const conflicts = [];

        const def = this.resolve(context);
        // The name should be a structure type or a type variable on a structure that contains this name type.
        if(!(def instanceof StructureDefinition || def instanceof TypeVariable))
            conflicts.push(new UnknownTypeName(this));
        else if(def instanceof StructureDefinition) {
            // If there are type inputs provided, verify that they exist on the function.
            if(this.types && this.types.types.length > 0) {
                const expected = def.types;
                for(let index = 0; index < this.types.types.length; index++) {
                    if(index >= (expected?.variables.length ?? 0)) {
                        conflicts.push(new InvalidTypeInput(this, this.types.types[index], def));
                        break;
                    }
                }
            }
        }

        return conflicts; 
    
    }

    acceptsAll(types: TypeSet, context: Context): boolean {    
        const thisType = this.getType(context);
        if(thisType === undefined) return false;
        return types.list().every(type => thisType.accepts(type, context));
    }

    resolve(context: Context): Definition | undefined {

        // Find the name in the binding scope.
        return this.getDefinitionOfNameInScope(this.getName(), context);

    }

    isTypeVariable(context: Context) { return this.resolve(context) instanceof TypeVariable; }

    getType(context: Context): Type {

        // The name should be defined.
        const definition = this.resolve(context);
        if(definition === undefined) return new UnknownNameType(this, this.name, undefined);
        else if(definition instanceof TypeVariable) return new VariableType(definition);
        else return definition instanceof Value ? definition.getType(context) : definition.getType(context);

    }

    getNativeTypeName(): NativeTypeName { return "name"; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A structure type"
        }
    }

    
    
    

}