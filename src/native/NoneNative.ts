import FunctionDefinition from "../nodes/FunctionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import Text from "../runtime/Text";
import Bool from "../runtime/Bool";
import None from "../runtime/None";
import Block from "../nodes/Block";
import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import NativeExpression from "./NativeExpression";
import BooleanType from "../nodes/BooleanType";
import TypeException from "../runtime/TypeException";
import NoneType from "../nodes/NoneType";
import type Value from "../runtime/Value";
import { createNativeConversion } from "./NativeBindings";

export default function bootstrapNone() {

    function createNativeNoneFunction(name: string, expression: (left: None, right: None) => Value) {
        return new FunctionDefinition(
            [], [ new Alias(name)], [],
            [ new Bind([], undefined, [ new Alias("val") ], new BooleanType()) ],
            new NativeExpression(
                new BooleanType(), 
                evaluation => {
                    const left = evaluation.getContext();
                    const right = evaluation.resolve("val");
                    // This should be impossible, but the type system doesn't know it.
                    if(!(left instanceof None)) return new TypeException(evaluation.getEvaluator(), new NoneType([]), left);
                    if(!(right instanceof None)) return new TypeException(evaluation.getEvaluator(), new NoneType([]), right);
                    return expression(left, right);
                },
                {
                    "😀": "TODO", 
                    eng: "Native none operation." 
                }
            ),
            new BooleanType()
        );
    }
    
    return new StructureDefinition(
        // TODO Localized documentation
        [],[], [], [], [],
        new Block([], [ 
            createNativeConversion([], "!", "''", (val: None) => new Text(val.toString())),
            createNativeNoneFunction("=", (left: None, right: None) => new Bool(left.isEqualTo(right))),
            createNativeNoneFunction("=", (left, right) => new Bool(!left.isEqualTo(right)))
        ], false, true)
    );

}