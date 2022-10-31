import Bind from "../nodes/Bind";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import Token from "../nodes/Token";
import { ETC_SYMBOL } from "../parser/Tokenizer";
import TokenType from "../nodes/TokenType";

const Group = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Group",
        "😀": "▣"
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS,
            {
                eng: "layout",
                "😀": TRANSLATE
            },
            new NameType("Layout")
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "phrases",
                "😀": TRANSLATE
            },
            new NameType("Phrase"),
            undefined,
            undefined,
            new Token(ETC_SYMBOL, TokenType.ETC)
        )
    ]
);

export default Group;