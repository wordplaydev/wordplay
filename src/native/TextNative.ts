import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import MeasurementType from "../nodes/MeasurementType";
import TextType from "../nodes/TextType";
import type Type from "../nodes/Type";
import Bool from "../runtime/Bool";
import type Evaluation from "../runtime/Evaluation";
import TypeException from "../runtime/TypeException";
import type Value from "../runtime/Value";
import { createNativeConversion, createNativeFunction } from "./NativeBindings";
import Text from "../runtime/Text";
import StructureDefinition from "../nodes/StructureDefinition";
import Measurement from "../runtime/Measurement";
import List from "../runtime/List";
import Block from "../nodes/Block";

export default function bootstrapText() {

    function createTextFunction(names: Alias[], inputs: Bind[], output: Type, expression: (text: Text, evaluation: Evaluation) => Value) {
        return createNativeFunction([], names, [], inputs, output,
            evaluation => {
                const text = evaluation.getContext();
                if(text instanceof Text) return expression(text, evaluation);
                else return new TypeException(evaluation.getEvaluator(), new TextType(), text);
            }
        );
    }

    return new StructureDefinition(
        // TODO Localized documentation
        [],[], [], [], [],
        new Block([], [ 
            createTextFunction([ new Alias("length", "eng") ], [], new MeasurementType(), 
                text => text.length()
            ),
            createTextFunction([ new Alias("=", "") ], [ new Bind([], undefined, [ new Alias("val", "eng") ], new TextType())], new BooleanType(), 
                (text, evaluation) => {
                    const val = evaluation.resolve("val");
                    if(val instanceof Text) return new Bool(text.isEqualTo(val));
                    else return new TypeException(evaluation.getEvaluator(), new TextType(), val);
                }
            ),
            createTextFunction([ new Alias("≠", "") ], [ new Bind([], undefined, [ new Alias("val", "eng") ], new TextType())], new BooleanType(), 
                (text, evaluation) => {
                    const val = evaluation.resolve("val");
                    if(val instanceof Text) return new Bool(!text.isEqualTo(val));
                    else return new TypeException(evaluation.getEvaluator(), new TextType(), val);
                }
            ),
            createNativeConversion([], '""', '[""]', (val: Text) => new List(val.text.split("").map(c => new Text(c)))),
            createNativeConversion([], '""', "#", (val: Text) => new Measurement(val.text))
        ], false, true)
    );
    
}