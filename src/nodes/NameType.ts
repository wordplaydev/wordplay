import type Conflict from "../conflicts/Conflict";
import { UnknownTypeName } from "../conflicts/UnknownTypeName";
import Token from "./Token";
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
import type Transform from "../transforms/Transform";
import Replace from "../transforms/Replace";
import NameToken from "./NameToken";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"

export default class NameType extends Type {

    readonly type: Token;

    constructor(type: Token | string) {
        super();

        this.type = typeof type === "string" ? new NameToken(type) : type;

        this.computeChildren();

    }

    getGrammar() { 
        return [
            { name: "type", types:[ Token ] },
        ];
    }

    getName() { return this.type.text.toString() }

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

        // Find the name in the binding scope.
        const scope = context.get(this)?.getBindingScope();
        // If there was one, ask it for the definition.
        if(scope)
            return context.get(this)?.getBindingScope()?.getDefinitionOfName(this.getName(), context, this);

        // If there wasn't one, then ask the shares for the definition.
        return context.shares.getDefinitionOfName(this.getName());

    }

    isTypeVariable(context: Context) { return this.resolve(context) instanceof TypeVariable; }

    getType(context: Context): Type {

        // The name should be defined.
        const definition = this.resolve(context);
        if(definition === undefined) return new UnknownType({ definition: this, name: this.type });
        else if(definition instanceof TypeVariable) return new VariableType(definition);
        else return definition instanceof Value ? definition.getType(context) : definition.getTypeUnlessCycle(context);

    }

    getNativeTypeName(): string { return NAME_NATIVE_TYPE_NAME; }

    replace(pretty: boolean=false, original?: Node, replacement?: Node) { 
        return new NameType(
            this.replaceChild(pretty, "type", this.type, original, replacement)
        ) as this;
    }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A structure type"
        }
    }

    getChildReplacement(child: Node, context: Context): Transform[] | undefined {

        const definition = this.resolve(context);
        if(child === this.type)
            // Any StructureDefinition and Type Variable in
            return (this.getAllDefinitions(this, context)
                    .filter(def => 
                        (def instanceof StructureDefinition || def instanceof TypeVariable) && 
                        def !== definition &&
                        // If the current name doesn't correspond to a type, then filter the types down to those that match the prefix.
                        (this.type.getText() === "" || def.getNames().find(name => name.startsWith(this.type.getText()) !== undefined))
                    ) as (StructureDefinition|TypeVariable)[])
                    .map(def => new Replace(context, child, [ name => new NameToken(name), def ]))

    }

    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval(): Transform | undefined { return undefined; }
}