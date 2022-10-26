import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import { TRANSLATE, WRITE, WRITE_DOCS } from "../nodes/Translations";
import { parseBind, tokens } from "../parser/Parser";
import { PLACEHOLDER_SYMBOL } from "../parser/Tokenizer";

const Group = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Group",
        "😀": TRANSLATE
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "layout",
                "😀": TRANSLATE
            },
            new NameType("Layout")
        ),
        new Bind(
            WRITE_DOCS,
            new Token(PLACEHOLDER_SYMBOL, TokenType.PLACEHOLDER),
            {
                eng: "phrases",
                "😀": TRANSLATE
            },
            new NameType("Phrase")
        )
    ]
);

export default Group;