import type Conflict from "../conflicts/Conflict";
import Bool from "../runtime/Bool";
import Exception, { ExceptionKind } from "../runtime/Exception";
import List from "../runtime/List";
import Alias from "./Alias";
import BooleanType from "./BooleanType";
import type ConversionDefinition from "./ConversionDefinition";
import FunctionDefinition from "./FunctionDefinition";
import Language from "./Language";
import NativeExpression from "./NativeExpression";
import type { ConflictContext } from "./Node";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";

export default class ListType extends Type {

    readonly open?: Token;
    readonly type?: Type | Unparsable;
    readonly close?: Token;

    constructor(open?: Token, close?: Token, type?: Type | Unparsable) {
        super();

        this.open = open;
        this.type = type;
        this.close = close;
    }

    getChildren() { 
        const children = [];
        if(this.open) children.push(this.open);
        if(this.type) children.push(this.type);
        if(this.close) children.push(this.close);
        return children;    
    }

    getConflicts(context: ConflictContext): Conflict[] { return []; }

    isCompatible(context: ConflictContext, type: Type): boolean {
        return type instanceof ListType && this.type instanceof Type && type.type instanceof Type && this.type.isCompatible(context, type.type);
    }

    getConversion(context: ConflictContext, type: Type): ConversionDefinition | undefined {
        // TODO Define conversions from booleans to other types
        // TODO Look for custom conversions that extend the Boolean type
        return undefined;
    }

    getFunction(context: ConflictContext, name: string): FunctionDefinition | undefined {
        return ListFunctions.find(f => f.hasName(name));
    }

}

export const ListFunctions: FunctionDefinition[] = [
    new FunctionDefinition(
        [], [ new Alias("first", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.first();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    ),
    new FunctionDefinition(
        [], [ new Alias("last", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.last();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    ),
    new FunctionDefinition(
        [], [ new Alias("sansFirst", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.sansFirst();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    ),
    new FunctionDefinition(
        [], [ new Alias("sansLast", new Language("eng")) ], [], [],
        new NativeExpression(
            // TODO This is wrong.
            new BooleanType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return list.sansLast();
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);
            }
        )
    )

]