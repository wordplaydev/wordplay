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

const OperandNames: Translations = {
    eng: "boolean",
    "😀": "?"
};

export default function bootstrapBool() {

    function createBooleanFunction(docs: Translations, names: Translations, expression: (left: Bool, right: Bool) => Bool) {
        return new FunctionDefinition(
            docs, 
            names,
            [],
            [ new Bind(
                {
                    eng: WRITE,
                    "😀": WRITE
                }, 
                OperandNames, 
                new BooleanType()
            ) ],
            new NativeExpression(
                new BooleanType(), 
                evaluation => {
                    const left = evaluation.getContext();
                    const right = evaluation.resolve(OperandNames.eng);
                    // This should be impossible, but the type system doesn't know it.
                    if(!(left instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), left);
                    if(!(right instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), right);
                    return expression(left, right);
                },
                { 
                    "😀": TRANSLATE,
                    eng: "Native boolean operation." 
                }
            ),
            new BooleanType()
        );
    }

    return new StructureDefinition(
        {
            eng: WRITE,
            "😀": WRITE
        },
        {
            eng: TRANSLATE,
            "😀": TRANSLATE
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
                (left, right) => left.and(right)
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
                (left, right) => left.or(right)
            ),
            new FunctionDefinition(
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
                    evaluation => {
                        const left = evaluation.getContext();
                        // This should be impossible, but the type system doesn't know it.
                        if(!(left instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), left);
                        return left.not();
                    },
                    {
                        "😀": TRANSLATE,
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
                (left, right) => new Bool(left.isEqualTo(right))
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
                (left, right) => new Bool(!left.isEqualTo(right))
            ),
            createNativeConversion(WRITE_DOCS, "?", "''", (val: Bool) => new Text(val.toString()))
        ], false, true)
    );
    
}