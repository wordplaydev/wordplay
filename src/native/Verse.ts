import Alias from "../nodes/Alias";
import Bind from "../nodes/Bind";
import Dimension from "../nodes/Dimension";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import NameType from "../nodes/NameType";
import StructureDefinition from "../nodes/StructureDefinition";
import TextLiteral from "../nodes/TextLiteral";
import TextType from "../nodes/TextType";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import Unit from "../nodes/Unit";
import { parseBind, tokens } from "../parser/Parser";

const Verse = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Verse",
        "😀": TRANSLATE
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "group",
                "😀": TRANSLATE
            },
            new NameType("Group")
        ),
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "font",
                "😀": TRANSLATE
            },
            new TextType(),
            new TextLiteral("'Noto Sans'")
        ),
        new Bind(
            WRITE_DOCS,
            undefined,
            {
                eng: "size",
                "😀": TRANSLATE
            },
            new MeasurementType(undefined, new Unit(undefined, [ new Dimension("pt") ])),
            new MeasurementLiteral(new Token("12", TokenType.NUMBER), new Unit(undefined, [ new Dimension("pt")]))
        )
    ]
);

export default Verse;