import Bind from "../nodes/Bind";
import Dimension from "../nodes/Dimension";
import MeasurementLiteral from "../nodes/MeasurementLiteral";
import MeasurementType from "../nodes/MeasurementType";
import StructureDefinition from "../nodes/StructureDefinition";
import TextLiteral from "../nodes/TextLiteral";
import TextType from "../nodes/TextType";
import Token from "../nodes/Token";
import TokenType from "../nodes/TokenType";
import { TRANSLATE, WRITE_DOCS } from "../nodes/Translations";
import Unit from "../nodes/Unit";

const Phrase = new StructureDefinition(
    WRITE_DOCS,
    {
        eng: "Phrase",
        "😀": TRANSLATE
    },
    [],
    [],
    [
        new Bind(
            WRITE_DOCS, 
            {
                eng: "text",
                "😀": TRANSLATE
            },
            new TextType()
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "size",
                "😀": TRANSLATE
            },
            new MeasurementType(undefined, new Unit(undefined, [ new Dimension("pt") ])),
            new MeasurementLiteral(new Token("12", TokenType.NUMBER), new Unit(undefined, [ new Dimension("pt")]))
        ),
        new Bind(
            WRITE_DOCS,
            {
                eng: "font",
                "😀": TRANSLATE
            },
            new TextType(),
            new TextLiteral(new Token("'Noto Sans'", TokenType.TEXT))
        )
    ]
);

export default Phrase;