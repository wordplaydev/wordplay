import Bind from "../nodes/Bind";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import PlaceholderToken from "../nodes/PlaceholderToken";

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
            new PlaceholderToken()
        )
    ]
);

export default Group;