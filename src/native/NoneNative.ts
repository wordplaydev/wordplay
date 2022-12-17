import FunctionDefinition from "../nodes/FunctionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import Text from "../runtime/Text";
import Bool from "../runtime/Bool";
import None from "../runtime/None";
import Block from "../nodes/Block";
import Bind from "../nodes/Bind";
import NativeExpression from "./NativeExpression";
import BooleanType from "../nodes/BooleanType";
import TypeException from "../runtime/TypeException";
import NoneType from "../nodes/NoneType";
import type Value from "../runtime/Value";
import { createNativeConversion } from "./NativeBindings";
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";
import type Translations from "../nodes/Translations";
import type Node from "../nodes/Node";
import { NONE_SYMBOL } from "../parser/Tokenizer";

export default function bootstrapNone() {

    function createNativeNoneFunction(docs: Translations, names: Translations, expression: (requestor: Node, left: None, right: None) => Value) {
        return FunctionDefinition.make(
            docs,
            names,
            undefined,
            [ Bind.make(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "val",
                    "😀": `${TRANSLATE}1`
                }, 
                new BooleanType()
            ) ],
            new NativeExpression(
                new BooleanType(), 
                (requestor, evaluation) => {
                    const left = evaluation.getClosure();
                    const right = evaluation.resolve("val");
                    // This should be impossible, but the type system doesn't know it.
                    if(!(left instanceof None)) return new TypeException(evaluation.getEvaluator(), NoneType.None, left);
                    if(!(right instanceof None)) return new TypeException(evaluation.getEvaluator(), NoneType.None, right);
                    return expression(requestor, left, right);
                },
                {
                    "😀": TRANSLATE, 
                    eng: "Native none operation." 
                }
            ),
            new BooleanType()
        );
    }
    
    return StructureDefinition.make(
        {
            eng: WRITE,
            "😀": WRITE
        },
        {
            eng: "none",
            "😀": TRANSLATE
        }, 
        [], 
        undefined, 
        [],
        new Block([ 
            createNativeConversion(WRITE_DOCS, NONE_SYMBOL, "''", (requestor, val: None) => new Text(requestor, val.toString())),
            createNativeNoneFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "equals",
                    "😀": "="
                }, 
                (requestor: Node, left: None, right: None) => new Bool(requestor, left.isEqualTo(right))
            ),
            createNativeNoneFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "not-equal",
                    "😀": "≠"
                }, 
                (requestor: Node, left: None, right: None) => new Bool(requestor, !left.isEqualTo(right))
            )
        ], false, true)
    );

}