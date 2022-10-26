import Bind from "../nodes/Bind";
import BooleanType from "../nodes/BooleanType";
import StructureDefinition from "../nodes/StructureDefinition";
import TextType from "../nodes/TextType";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";

const Key = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Key",
        "😀": TRANSLATE
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS,
            {
                eng: "key",
                "😀": TRANSLATE
            },
            new TextType()
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "down",
                "😀": TRANSLATE
            },
            new BooleanType()
        )
    ]
);

export default Key;