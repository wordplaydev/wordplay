import type Conflict from "../conflicts/Conflict";
import Text from "../runtime/Text";
import Exception, { ExceptionKind } from "../runtime/Exception";
import List from "../runtime/List";
import Alias from "./Alias";
import BooleanType from "./BooleanType";
import ConversionDefinition from "./ConversionDefinition";
import FunctionDefinition from "./FunctionDefinition";
import Language from "./Language";
import NativeExpression from "./NativeExpression";
import type { ConflictContext } from "./Node";
import TextType from "./TextType";
import type Token from "./Token";
import Type from "./Type";
import type Unparsable from "./Unparsable";
import SetOrMapType from "./SetOrMapType";
import SetValue from "../runtime/SetValue";

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
        return ListConversions.find(f => f.convertsType(type, context));
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
        // TODO Documentation
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

export const ListConversions: ConversionDefinition[] = [
    new ConversionDefinition(
        [], // TODO Documentation
        new TextType(),
        new NativeExpression(
            new TextType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return new Text(list.toString());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    ),
    new ConversionDefinition(
        [], // TODO Documentation
        new SetOrMapType(),
        new NativeExpression(
            new SetOrMapType(),
            evaluator => {
                const list = evaluator.getEvaluationContext()?.getContext();
                if(list instanceof List) return new SetValue(list.getValues());
                else return new Exception(undefined, ExceptionKind.EXPECTED_TYPE);                
            }
        )
    )
];