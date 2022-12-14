import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import type Translations from "../nodes/Translations";
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";
import { AND_SYMBOL, NOT_SYMBOL, OR_SYMBOL } from "../parser/Tokenizer";
import Bool from "../runtime/Bool";
import Text from "../runtime/Text";
import TypeException from "../runtime/TypeException";
import { createNativeConversion } from "./NativeBindings";
import NativeExpression from "./NativeExpression";
import type Node from "../nodes/Node";
import type Value from "../runtime/Value";

const OperandNames: Translations = {
    eng: "boolean",
    "😀": `${TRANSLATE}1`
};

export default function bootstrapBool() {

    function createBooleanFunction(docs: Translations, names: Translations, expression: (requestor: Node, left: Bool, right: Bool) => Bool) {
        return FunctionDefinition.make(
            docs, 
            names,
            [],
            [ Bind.make(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                OperandNames, 
                new BooleanType()
            ) ],
            new NativeExpression(
                new BooleanType(), 
                (requestor, evaluation) => {
                    const left = evaluation.getClosure();
                    const right: Value | undefined = evaluation.resolve(OperandNames.eng);
                    // This should be impossible, but the type system doesn't know it.
                    if(!(left instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), left);
                    if(!(right instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), right);
                    return expression(requestor, left, right);
                },
                { 
                    "😀": WRITE,
                    eng: "Native boolean operation." 
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
            eng: "bool",
            "😀": `${TRANSLATE}bool`
        }, 
        [], 
        [], 
        [],
        new Block([
            createBooleanFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "and",
                    "😀": AND_SYMBOL
                }, 
                (requestor, left, right) => left.and(requestor, right)
            ),
            createBooleanFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: OR_SYMBOL,
                    "😀": TRANSLATE
                }, 
                (requestor, left, right) => left.or(requestor, right)
            ),
            FunctionDefinition.make(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                {
                    eng: "not",
                    "😀": NOT_SYMBOL
                }, 
                [], 
                [],
                new NativeExpression(
                    new BooleanType(), 
                    (requestor, evaluation) => {
                        const left = evaluation.getClosure();
                        // This should be impossible, but the type system doesn't know it.
                        if(!(left instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), left);
                        return left.not(requestor);
                    },
                    {
                        "😀": WRITE,
                        eng: "Logical not." 
                    }
                ),
                new BooleanType()
            ),
            createBooleanFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "equals",
                    "😀": "="
                }, 
                (requestor, left, right) => new Bool(requestor, left.isEqualTo(right))
            ),
            createBooleanFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "not-equal",
                    "😀": "≠"
                }, 
                (requestor, left, right) => new Bool(requestor, !left.isEqualTo(right))
            ),
            createNativeConversion(WRITE_DOCS, "?", "''", (requestor, val: Value) => new Text(requestor, val.toString()))
        ], false, true)
    );
    
}