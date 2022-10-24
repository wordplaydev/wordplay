import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import Block from "../nodes/Block";
import BooleanType from "../nodes/BooleanType";
import FunctionDefinition from "../nodes/FunctionDefinition";
import StructureDefinition from "../nodes/StructureDefinition";
import { AND_SYMBOL, NOT_SYMBOL, OR_SYMBOL } from "../parser/Tokenizer";
import Bool from "../runtime/Bool";
import Text from "../runtime/Text";
import TypeException from "../runtime/TypeException";
import { createNativeConversion } from "./NativeBindings";
import NativeExpression from "./NativeExpression";

const OperandNames = {
    eng: "boolean"
}

export default function bootstrapBool() {

    function createBooleanFunction(name: string, expression: (left: Bool, right: Bool) => Bool) {
        return new FunctionDefinition(
            [], [ new Alias(name)], [],
            [ new Bind([], undefined, [ new Alias(OperandNames.eng) ], new BooleanType()) ],
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
                { eng: "Native boolean operation." }
            ),
            new BooleanType()
        );
    }

    return new StructureDefinition(
        // TODO Localized documentation
        [],[], [], [], [],
        new Block([], [
            createBooleanFunction(AND_SYMBOL, (left, right) => left.and(right)),
            createBooleanFunction(OR_SYMBOL, (left, right) => left.or(right)),
            new FunctionDefinition(
                [], [ new Alias(NOT_SYMBOL), new Alias("~")], [], [],
                new NativeExpression(
                    new BooleanType(), 
                    evaluation => {
                        const left = evaluation.getContext();
                        // This should be impossible, but the type system doesn't know it.
                        if(!(left instanceof Bool)) return new TypeException(evaluation.getEvaluator(), new BooleanType(), left);
                        return left.not();
                    },
                    { eng: "Logical not." }
                ),
                new BooleanType()
            ),
            createBooleanFunction("=", (left, right) => new Bool(left.isEqualTo(right))),
            createBooleanFunction("≠", (left, right) => new Bool(!left.isEqualTo(right))),
            createNativeConversion([], "?", "''", (val: Bool) => new Text(val.toString()))
        ], false, true)
    );
    
}