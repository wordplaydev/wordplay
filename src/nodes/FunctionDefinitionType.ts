import Type from "./Type";
import type Context from "./Context";
import type Translations from "./Translations";
import { TRANSLATE } from "./Translations"
import type FunctionDefinition from "./FunctionDefinition";
import FunctionType from "./FunctionType";
import type { NativeTypeName } from "../native/NativeConstants";
import type TypeSet from "./TypeSet";

export default class FunctionDefinitionType extends Type {

    readonly fun: FunctionDefinition;

    constructor(fun: FunctionDefinition) {

        super();

        this.fun = fun;
    }

    getGrammar() { return []; }
    computeConflicts() { return []; }

    /** Compatible if it's the same structure definition, or the given type is a refinement of the given structure.*/
    acceptsAll(types: TypeSet, context: Context): boolean {
        return types.list().every(type => {

            if(type instanceof FunctionDefinitionType && this.fun === type.fun) return true;

            // If the signatures match, yes!
            return type instanceof FunctionType && 
                this.fun.inputs.length === type.inputs.length && 
                this.fun.inputs.every((input, index) => input.getType(context).accepts(type.inputs[index].getType(context), context)) &&
                this.fun.getOutputType(context) && type.output instanceof Type && this.fun.getOutputType(context).accepts(type.output, context);
        });
    }

    getNativeTypeName(): NativeTypeName { return "function"; }

    replace() { return new FunctionDefinitionType(this.fun) as this; }

    toWordplay() { return this.fun.toWordplay(); }

    getChildReplacement() { return undefined; }
    getInsertionBefore() { return undefined; }
    getInsertionAfter() { return undefined; }
    getChildRemoval() { return undefined; }

    getDescriptions(): Translations {
        return {
            "😀": TRANSLATE,
            eng: "A function definition type"
        }
    }

}