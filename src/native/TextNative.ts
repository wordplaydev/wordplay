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
import type Translations from "../nodes/Translations";
import { TRANSLATE, WRITE } from "../nodes/Translations";

export default function bootstrapText() {

    function createTextFunction(docs: Translations, names: Translations, inputs: Bind[], output: Type, expression: (text: Text, evaluation: Evaluation) => Value) {
        return createNativeFunction(docs, names, [], inputs, output,
            evaluation => {
                const text = evaluation.getContext();
                if(text instanceof Text) return expression(text, evaluation);
                else return new TypeException(evaluation.getEvaluator(), new TextType(), text);
            }
        );
    }

    return new StructureDefinition(
        [],[], [], [], [],
        new Block([], [ 
            createTextFunction(
                {
                eng: WRITE,
                "😀": WRITE
                },
                {
                    eng: "length",
                    "😀": TRANSLATE
                }, 
                [], 
                new MeasurementType(), 
                text => text.length()
            ),
            createTextFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: WRITE,
                    "😀": "="
                }, [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    undefined, 
                    {
                        eng: "val",
                        "😀": TRANSLATE
                    }, 
                    new TextType()
                )],
                new BooleanType(), 
                (text, evaluation) => {
                    const val = evaluation.resolve("val");
                    if(val instanceof Text) return new Bool(text.isEqualTo(val));
                    else return new TypeException(evaluation.getEvaluator(), new TextType(), val);
                }
            ),
            createTextFunction(
                {
                    eng: WRITE,
                    "😀": WRITE
                },
                {
                    eng: "not-equal",
                    "😀": "≠"
                }, [ new Bind(
                    {
                        eng: WRITE,
                        "😀": WRITE
                    }, 
                    undefined, 
                    {
                        eng: "val",
                        "😀": TRANSLATE
                    }, 
                    new TextType()
                )], 
                new BooleanType(), 
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