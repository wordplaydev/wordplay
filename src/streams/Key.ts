import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import StructureDefinition from "../nodes/StructureDefinition";
import TextType from "../nodes/TextType";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";

const Key = StructureDefinition.make(
    WRITE_DOCS,
    {
        eng: "Key",
        "😀": TRANSLATE
    },
    [],
    [],
    [
        Bind.make(
            WRITE_DOCS,
            {
                eng: "key",
                "😀": `${TRANSLATE}1`
            },
            TextType.make()
        ),
        Bind.make(
            WRITE_DOCS,
            {
                eng: "down",
                "😀": `${TRANSLATE}2`
            },
            new BooleanType()
        )
    ]
);

export default Key;